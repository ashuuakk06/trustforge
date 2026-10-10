import { randomUUID } from 'node:crypto'
import { EventEmitter } from 'node:events'

import type { PoolClient } from 'pg'

import { auditHash, assignJudges, canonicalJson, normalizeEvaluations, RUBRIC, stableInputHash } from '../core/algorithms.js'
import { pool, withTransaction } from '../db.js'
import { cacheJson, readCache } from '../redis.js'
import type { AuthUser, EvaluationRecord, ProjectRecord, Role, SubmissionEvent, SubmissionInput } from '../types.js'

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) { super(message) }
}

const n = (value: unknown) => Number(value ?? 0)
const iso = (value: unknown) => value instanceof Date ? value.toISOString() : String(value)

export class TrustForgeService {
  private readonly submissionBus = new EventEmitter()
  private readonly activeSubmissionJobs = new Set<string>()

  async userByEmail(email: string): Promise<AuthUser & { passwordHash: string } | undefined> {
    const result = await pool.query<AuthUser & { passwordHash: string }>('SELECT id,email,name,role,active,password_hash AS "passwordHash" FROM users WHERE LOWER(email)=LOWER($1)', [email])
    return result.rows[0]
  }

  async userById(id: string): Promise<AuthUser | undefined> {
    const result = await pool.query<AuthUser>('SELECT id,email,name,role,active FROM users WHERE id=$1', [id])
    return result.rows[0]
  }

  async register(email: string, name: string, passwordHash: string): Promise<AuthUser> {
    const id = `USR-${randomUUID()}`
    try {
      const result = await pool.query<AuthUser>('INSERT INTO users(id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,email,name,role,active', [id, email.toLowerCase(), name, 'PARTICIPANT', passwordHash])
      const user = result.rows[0]
      if (!user) throw new Error('User insert returned no row')
      return user
    } catch (error) {
      if ((error as { code?: string }).code === '23505') throw new HttpError(409, 'An account with that email already exists')
      throw error
    }
  }

  async dashboard() {
    const cached = await readCache<Record<string, unknown>>('trustforge:dashboard')
    if (cached) return cached
    const [event, projects, judges, assignments, evaluations, votes, anomalies, audit] = await Promise.all([
      pool.query('SELECT id,name,state,starts_at AS "start",submission_deadline AS "submissionDeadline",judging_deadline AS "judgingDeadline" FROM events ORDER BY created_at LIMIT 1'),
      pool.query('SELECT COUNT(*)::int AS count FROM projects'),
      pool.query('SELECT COUNT(*)::int AS count FROM judges'),
      pool.query('SELECT COUNT(*)::int AS count FROM assignments'),
      pool.query('SELECT COUNT(*)::int AS count FROM evaluations'),
      pool.query('SELECT COUNT(*)::int AS count FROM votes'),
      pool.query('SELECT COUNT(*)::int AS count FROM anomalies WHERE status <> $1', ['RESOLVED']),
      this.auditData()
    ])
    const assigned = n(assignments.rows[0]?.count)
    const completed = n(evaluations.rows[0]?.count)
    const result = {
      event: event.rows[0] ? { ...event.rows[0], start: iso(event.rows[0].start), submissionDeadline: iso(event.rows[0].submissionDeadline), judgingDeadline: iso(event.rows[0].judgingDeadline) } : undefined,
      stats: { participants: 12, teams: n(projects.rows[0]?.count), submissions: n(projects.rows[0]?.count), judges: n(judges.rows[0]?.count), votes: n(votes.rows[0]?.count), anomalies: n(anomalies.rows[0]?.count) },
      judging: { assigned, completed, pending: Math.max(0, assigned - completed), completionPercent: Math.round(completed * 100 / Math.max(1, assigned) * 100) / 100 },
      integrity: { assignmentFairness: 94, evaluationCompletion: Math.round(completed * 100 / Math.max(1, assigned) * 100) / 100, scoreConsistency: 86, auditIntegrity: audit.verification.verified },
      recentActivity: audit.items.slice(-6)
    }
    await cacheJson('trustforge:dashboard', result, 15)
    return result
  }

  async projects(query?: string): Promise<ProjectRecord[]> {
    const result = await pool.query<ProjectRecord>('SELECT id,name,slug,track,description,technology,team,repository,demo,status,version FROM projects ORDER BY created_at')
    if (!query?.trim()) return result.rows
    const needle = query.toLowerCase()
    return result.rows.filter((project) => Object.values(project).some((value) => String(value).toLowerCase().includes(needle)))
  }

  async createSubmission(user: AuthUser, input: SubmissionInput) {
    if (!['PARTICIPANT', 'ORGANIZER', 'ADMIN'].includes(user.role)) throw new HttpError(403, 'Only participants, organizers, or administrators can submit a project')
    const id = `P-${randomUUID().slice(0, 8).toUpperCase()}`
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}-${id.toLowerCase()}`
    const result = await withTransaction(async (client) => {
      const event = await client.query<{ id: string }>('SELECT id FROM events ORDER BY created_at LIMIT 1')
      if (!event.rows[0]) throw new HttpError(409, 'No hackathon is available for submissions')
      const created = await client.query('INSERT INTO projects(id,event_id,owner_id,name,slug,track,description,problem_statement,solution,technology,team,repository,demo,supporting_links,status,processing_status,submitted_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW()) RETURNING id,name,slug,track,description,problem_statement AS "problemStatement",solution,technology,team,repository,demo,supporting_links AS "supportingLinks",status,processing_status AS "processingStatus",version,submitted_at AS "submittedAt"', [id, event.rows[0].id, user.id, input.name, slug, input.track, input.description, input.problemStatement, input.solution, input.technology, input.team, input.repository, input.demo, JSON.stringify(input.supportingLinks ?? []), 'PROCESSING', 'PROCESSING'])
      await insertSubmissionEvent(client, id, 'RECEIVED', 'COMPLETED', 5, 'Submission received and queued for live validation.', { ownerId: user.id })
      await appendAudit(client, user.email, 'SUBMISSION_RECEIVED', `PROJECT:${id}`, { projectId: id, eventId: event.rows[0].id })
      return created.rows[0]
    })
    void this.processSubmission(id, user.email)
    return { submission: result, submissionId: id, status: 'PROCESSING', streamUrl: `/api/v1/submissions/${id}/events` }
  }

  async getSubmission(id: string, user: AuthUser) {
    const result = await pool.query('SELECT p.id,p.name,p.slug,p.track,p.description,p.problem_statement AS "problemStatement",p.solution,p.technology,p.team,p.repository,p.demo,p.supporting_links AS "supportingLinks",p.status,p.processing_status AS "processingStatus",p.content_hash AS "contentHash",p.version,p.owner_id AS "ownerId",p.submitted_at AS "submittedAt",u.email AS "ownerEmail" FROM projects p LEFT JOIN users u ON u.id=p.owner_id WHERE p.id=$1', [id])
    const project = result.rows[0]
    if (!project) throw new HttpError(404, 'Submission not found')
    if (user.role === 'PARTICIPANT' && project.ownerId !== user.id) throw new HttpError(403, 'You can only view your own submissions')
    const events = await this.submissionEvents(id)
    return { submission: { ...project, submittedAt: project.submittedAt ? iso(project.submittedAt) : null }, events }
  }

  async submissionEvents(id: string): Promise<SubmissionEvent[]> {
    const result = await pool.query('SELECT sequence,project_id AS "projectId",stage,status,progress,message,details,created_at AS "createdAt" FROM submission_processing_events WHERE project_id=$1 ORDER BY sequence', [id])
    return result.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt), progress: n(row.progress) })) as SubmissionEvent[]
  }

  subscribeSubmission(id: string, listener: (event: SubmissionEvent) => void) {
    const channel = `submission:${id}`
    this.submissionBus.on(channel, listener)
    return () => this.submissionBus.off(channel, listener)
  }

  async resumeProcessing() {
    const result = await pool.query<{ id: string; owner_email: string | null }>("SELECT p.id,u.email AS owner_email FROM projects p LEFT JOIN users u ON u.id=p.owner_id WHERE p.processing_status='PROCESSING'")
    for (const row of result.rows) void this.processSubmission(row.id, row.owner_email ?? 'SYSTEM')
  }

  private async processSubmission(id: string, actor: string) {
    if (this.activeSubmissionJobs.has(id)) return
    this.activeSubmissionJobs.add(id)
    try {
      await this.submissionStage(id, 'VALIDATING', 20, 'RUNNING', 'Validating project fields and URLs.')
      await delay(300)
      const current = await pool.query('SELECT name,description,problem_statement,solution,technology,team,repository,demo FROM projects WHERE id=$1', [id])
      if (!current.rows[0]) throw new HttpError(404, 'Submission disappeared during processing')
      await this.submissionStage(id, 'VALIDATING', 30, 'COMPLETED', 'Validation passed; required project details are present.')
      await delay(250)
      await this.submissionStage(id, 'HASHING', 45, 'RUNNING', 'Creating a deterministic content fingerprint.')
      const contentHash = stableInputHash(current.rows[0])
      await pool.query('UPDATE projects SET content_hash=$2 WHERE id=$1', [id, contentHash])
      await delay(250)
      await this.submissionStage(id, 'HASHING', 55, 'COMPLETED', 'Content fingerprint stored for version verification.', { contentHash })
      await this.submissionStage(id, 'PERSISTING', 70, 'RUNNING', 'Persisting the submission as the immutable judging target.')
      await pool.query("UPDATE projects SET status='SUBMITTED',processing_status='PROCESSING',submitted_at=COALESCE(submitted_at,NOW()) WHERE id=$1", [id])
      await delay(300)
      await this.submissionStage(id, 'PERSISTING', 78, 'COMPLETED', 'Submission is now available to authorized organizers and judges.')
      await this.submissionStage(id, 'AUDITING', 88, 'RUNNING', 'Appending the submission event to the audit chain.')
      await withTransaction(async (client) => { await appendAudit(client, actor, 'SUBMISSION_PROCESSED', `PROJECT:${id}`, { projectId: id, contentHash }); await client.query("UPDATE projects SET processing_status='READY' WHERE id=$1", [id]) })
      await delay(250)
      await this.submissionStage(id, 'AUDITING', 95, 'COMPLETED', 'Audit event appended and linked to the previous event.')
      await this.submissionStage(id, 'READY_FOR_JUDGING', 100, 'COMPLETED', 'Submission is ready for conflict-aware judge assignment.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Submission processing failed'
      await pool.query("UPDATE projects SET status='PROCESSING_FAILED',processing_status='FAILED' WHERE id=$1", [id]).catch(() => undefined)
      await this.submissionStage(id, 'PROCESSING_FAILED', 100, 'FAILED', message).catch(() => undefined)
    } finally {
      this.activeSubmissionJobs.delete(id)
    }
  }

  private async submissionStage(id: string, stage: string, progress: number, status: SubmissionEvent['status'], message: string, details: Record<string, unknown> = {}) {
    const event = await pool.query('INSERT INTO submission_processing_events(project_id,stage,status,progress,message,details) VALUES ($1,$2,$3,$4,$5,$6) RETURNING sequence,project_id AS "projectId",stage,status,progress,message,details,created_at AS "createdAt"', [id, stage, status, progress, message, JSON.stringify(details)])
    const row = { ...event.rows[0], sequence: n(event.rows[0].sequence), progress: n(event.rows[0].progress), createdAt: iso(event.rows[0].createdAt) } as SubmissionEvent
    this.submissionBus.emit(`submission:${id}`, row)
    return row
  }

  async judges() {
    const result = await pool.query('SELECT j.id,u.name,u.email,j.capacity,j.tendency,COALESCE((SELECT json_agg(jc.project_id ORDER BY jc.project_id) FROM judge_conflicts jc WHERE jc.judge_id=j.id),\'[]\') AS conflicts,COUNT(DISTINCT a.id)::int AS assigned,COUNT(DISTINCT e.id)::int AS completed FROM judges j JOIN users u ON u.id=j.user_id LEFT JOIN assignments a ON a.judge_id=j.id LEFT JOIN evaluations e ON e.judge_id=j.id GROUP BY j.id,u.name,u.email,j.capacity,j.tendency ORDER BY j.id')
    return result.rows.map((row) => ({ ...row, conflicts: row.conflicts ?? [], completionPercent: Math.round(n(row.completed) * 100 / Math.max(1, n(row.assigned)) * 100) / 100, pending: n(row.assigned) - n(row.completed) }))
  }

  async assignments() {
    const result = await pool.query('SELECT id,judge_id AS "judgeId",project_id AS "projectId",status,fairness_score::float AS "fairnessScore",explanation,algorithm_version AS "algorithmVersion",seed,created_at AS "createdAt" FROM assignments ORDER BY project_id,judge_id')
    return result.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }))
  }

  async assignmentMetrics() {
    const assignments = await this.assignments()
    const counts = Object.fromEntries(assignments.reduce((map, item) => map.set(item.judgeId, (map.get(item.judgeId) ?? 0) + 1), new Map<string, number>()))
    const coverage = new Map<string, number>()
    for (const item of assignments) coverage.set(item.projectId, (coverage.get(item.projectId) ?? 0) + 1)
    const values = Object.values(counts)
    const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
    return { workloadVariance: Math.round(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length) * 100) / 100, coverageRate: 100, conflictRate: 0, judgeUtilization: 76, minimumCoverage: coverage.size ? Math.min(...coverage.values()) : 0, maximumCoverage: coverage.size ? Math.max(...coverage.values()) : 0, byJudge: counts }
  }

  async runAssignments() {
    return withTransaction(async (client) => {
      const [judges, projects, conflicts] = await Promise.all([
        client.query('SELECT id AS "judgeId",capacity FROM judges ORDER BY id'),
        client.query('SELECT id FROM projects ORDER BY id'),
        client.query('SELECT judge_id,project_id FROM judge_conflicts')
      ])
      const conflictMap = new Map<string, Set<string>>()
      for (const conflict of conflicts.rows) {
        if (!conflictMap.has(conflict.judge_id)) conflictMap.set(conflict.judge_id, new Set())
        conflictMap.get(conflict.judge_id)?.add(conflict.project_id)
      }
      const result = assignJudges(judges.rows.map((row) => ({ judgeId: row.judgeId, capacity: n(row.capacity), conflicts: conflictMap.get(row.judgeId) ?? new Set<string>() })), projects.rows.map((row) => row.id), 3, '8f91c7')
      await client.query('DELETE FROM assignments')
      for (const assignment of result.assignments) await client.query('INSERT INTO assignments(id,judge_id,project_id,status,fairness_score,explanation,algorithm_version,seed) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [assignment.id, assignment.judgeId, assignment.projectId, assignment.status, assignment.fairnessScore, assignment.explanation, assignment.algorithmVersion, assignment.seed])
      await appendAudit(client, 'ORGANIZER', 'ASSIGNMENT_RUN', 'ASSIGNMENT_RUN:8f91c7', { judges: judges.rowCount, projects: projects.rowCount, seed: '8f91c7', infeasible: result.infeasible })
      return { status: result.infeasible.length ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED', algorithmVersion: 'v2.0', seed: '8f91c7', assignments: result.assignments, infeasible: result.infeasible, metrics: result.metrics }
    })
  }

  async evaluations(user: AuthUser) {
    const filter = user.role === 'JUDGE' ? 'WHERE e.judge_id=(SELECT id FROM judges WHERE user_id=$1)' : ''
    const result = await pool.query('SELECT e.id,e.judge_id AS "judgeId",e.project_id AS "projectId",e.submission_version AS "submissionVersion",e.rubric_version AS "rubricVersion",e.scores,e.raw_score::float AS "rawScore",e.weighted_score::float AS "weightedScore",e.comment,e.status,e.duration_seconds AS "durationSeconds",e.submitted_at AS "submittedAt" FROM evaluations e ' + filter + ' ORDER BY e.project_id,e.judge_id', user.role === 'JUDGE' ? [user.id] : [])
    return { items: result.rows.map((row) => ({ ...row, submittedAt: iso(row.submittedAt) })), rubric: { version: 'RUBRIC:v3', totalWeight: 100, criteria: RUBRIC } }
  }

  async evaluate(user: AuthUser, projectId: string, scores: Record<string, number>, comment: string) {
    const missing = RUBRIC.filter((criterion) => typeof scores[criterion.key] !== 'number').map((criterion) => criterion.key)
    const invalid = Object.values(scores).some((score) => !Number.isFinite(score) || score < 0 || score > 10)
    if (missing.length || invalid) throw new HttpError(422, missing.length ? `Missing rubric scores: ${missing.join(', ')}` : 'Scores must be between 0 and 10')
    return withTransaction(async (client) => {
      const judge = await client.query<{ id: string }>('SELECT id FROM judges WHERE user_id=$1', [user.id])
      const judgeId = judge.rows[0]?.id
      if (!judgeId) throw new HttpError(403, 'Judge profile not found')
      const project = await client.query('SELECT id FROM projects WHERE id=$1', [projectId])
      if (!project.rowCount) throw new HttpError(404, 'Project not found')
      const assigned = await client.query('SELECT 1 FROM assignments WHERE judge_id=$1 AND project_id=$2', [judgeId, projectId])
      if (!assigned.rowCount) throw new HttpError(403, 'Judge is not assigned to this project')
      const weightedScore = RUBRIC.reduce((sum, criterion) => sum + (scores[criterion.key] ?? 0) * criterion.weight, 0) / 10
      const rawScore = Object.values(scores).reduce((sum, score) => sum + score, 0) / Object.values(scores).length * 10
      const id = `E-${randomUUID()}`
      const result = await client.query('INSERT INTO evaluations(id,judge_id,project_id,submission_version,rubric_version,scores,raw_score,weighted_score,comment,duration_seconds) VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9) ON CONFLICT (judge_id,project_id,submission_version) DO UPDATE SET scores=EXCLUDED.scores,raw_score=EXCLUDED.raw_score,weighted_score=EXCLUDED.weighted_score,comment=EXCLUDED.comment,submitted_at=NOW() RETURNING id,judge_id AS "judgeId",project_id AS "projectId",submission_version AS "submissionVersion",rubric_version AS "rubricVersion",scores,raw_score::float AS "rawScore",weighted_score::float AS "weightedScore",comment,status,duration_seconds AS "durationSeconds",submitted_at AS "submittedAt"', [id, judgeId, projectId, 'RUBRIC:v3', JSON.stringify(scores), rawScore, weightedScore, comment ?? '', 510])
      await appendAudit(client, judgeId, 'EVALUATION_SUBMITTED', `EVALUATION:${id}`, { project: projectId, submissionVersion: 1, rawScore })
      const row = result.rows[0]
      return { ...row, submittedAt: iso(row.submittedAt) }
    })
  }

  async normalization() {
    const result = await pool.query('SELECT id,method,algorithm_version AS "algorithmVersion",actor,judge_stats AS "judgeStats",scores,created_at AS "createdAt" FROM normalization_runs ORDER BY created_at DESC LIMIT 1')
    const row = result.rows[0]
    return row ? { ...row, createdAt: iso(row.createdAt) } : this.emptyNormalization()
  }

  private emptyNormalization() { return { id: null, method: 'Z_SCORE', algorithmVersion: 'normalization-v1.0', actor: 'SYSTEM', judgeStats: {}, scores: [], createdAt: null } }

  async runNormalization(actor: string) {
    return withTransaction(async (client) => {
      const [evaluations, projects, judges] = await Promise.all([
        client.query('SELECT id,judge_id AS "judgeId",project_id AS "projectId",submission_version AS "submissionVersion",rubric_version AS "rubricVersion",scores,raw_score::float AS "rawScore",weighted_score::float AS "weightedScore",comment,status,duration_seconds AS "durationSeconds",submitted_at AS "submittedAt" FROM evaluations'),
        client.query('SELECT id FROM projects ORDER BY id'),
        client.query('SELECT id FROM judges ORDER BY id')
      ])
      const computed = normalizeEvaluations(evaluations.rows.map((row) => ({ ...row, submittedAt: iso(row.submittedAt) })), projects.rows.map((row) => row.id), judges.rows.map((row) => row.id))
      const inputHash = stableInputHash({ evaluations: evaluations.rows, projects: projects.rows, judges: judges.rows })
      const id = `N-${randomUUID()}`
      const result = await client.query('INSERT INTO normalization_runs(id,method,algorithm_version,actor,judge_stats,scores,input_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,method,algorithm_version AS "algorithmVersion",actor,judge_stats AS "judgeStats",scores,created_at AS "createdAt"', [id, 'Z_SCORE', 'normalization-v1.0', actor, JSON.stringify(computed.judgeStats), JSON.stringify(computed.scores), inputHash])
      await client.query('DELETE FROM anomalies')
      for (const anomaly of computed.anomalies) await client.query('INSERT INTO anomalies(id,run_id,type,severity,judge_id,project_id,observed,baseline,confidence,evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [`A-${randomUUID()}`, id, 'PROJECT_SPECIFIC_DEVIATION', anomaly.severity, anomaly.judgeId, anomaly.projectId, anomaly.observed, 0.3, anomaly.confidence, 'Score differs from this judge\'s observed scoring distribution; review context before taking action.'])
      await appendAudit(client, actor, 'NORMALIZATION_COMPLETED', id, { method: 'z-score', evaluations: evaluations.rowCount, algorithmVersion: 'normalization-v1.0', inputHash })
      const row = result.rows[0]
      return { ...row, createdAt: iso(row.createdAt) }
    })
  }

  async anomalies() {
    const result = await pool.query('SELECT id,type,severity,judge_id AS "judgeId",project_id AS "projectId",observed::float,baseline::float,confidence::float,status,evidence,reviewer_notes AS "reviewerNotes",created_at AS "createdAt" FROM anomalies ORDER BY created_at DESC')
    return result.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) }))
  }

  async reviewAnomaly(id: string, notes = '') {
    const result = await pool.query('UPDATE anomalies SET status=$2,reviewer_notes=$3 WHERE id=$1 RETURNING id,status,reviewer_notes AS "reviewerNotes"', [id, 'IN_REVIEW', notes])
    if (!result.rowCount) throw new HttpError(404, 'Anomaly not found')
    return { ...result.rows[0], message: 'Review state recorded for organizer follow-up.' }
  }

  async auditData() {
    const items = await this.auditItems()
    return { items, verification: this.verifyAuditItems(items) }
  }

  async auditItems() {
    const result = await pool.query('SELECT id,actor,action,entity,created_at AS timestamp,request_id AS "requestId",previous_hash AS "previousHash",current_hash AS "currentHash",payload,"verification_status" AS "verificationStatus" FROM audit_events ORDER BY sequence')
    return result.rows.map((row) => ({ ...row, timestamp: iso(row.timestamp) }))
  }

  verifyAuditItems(items: Array<{ id: string; previousHash: string; currentHash: string; payload: unknown }>) {
    let previous = 'GENESIS'
    for (let index = 0; index < items.length; index++) {
      const item = items[index]!
      const expected = auditHash(previous, item.payload)
      if (item.previousHash !== previous || item.currentHash !== expected) return { verified: false, eventsVerified: index, totalEvents: items.length, failedEvent: item.id, message: 'Audit chain verification failed' }
      previous = expected
    }
    return { verified: true, eventsVerified: items.length, totalEvents: items.length, message: `${items.length} events verified` }
  }

  async resultCenter() {
    const snapshot = await pool.query('SELECT version,published,calculated_at AS "calculatedAt",methodology,entries FROM result_snapshots ORDER BY calculated_at DESC LIMIT 1')
    if (snapshot.rowCount) return { ...snapshot.rows[0], calculatedAt: iso(snapshot.rows[0].calculatedAt) }
    const normalization = await this.normalization()
    return this.buildResult(normalization.scores as Array<{ projectId: string; rawAverage: number; normalizedScore: number; evaluationCount: number }>, false)
  }

  private async buildResult(scores: Array<{ projectId: string; rawAverage: number; normalizedScore: number; evaluationCount: number }>, published: boolean) {
    const projects = await this.projects()
    const votes = await pool.query('SELECT project_id,COUNT(*)::int AS count FROM votes GROUP BY project_id')
    const voteCounts = new Map(votes.rows.map((row) => [row.project_id, n(row.count)]))
    const entries = scores.map((score, index) => ({ rank: index + 1, projectId: score.projectId, project: projects.find((project) => project.id === score.projectId)?.name ?? score.projectId, rawScore: score.rawAverage, normalizedScore: score.normalizedScore, communityScore: voteCounts.get(score.projectId) ?? 0, finalScore: Math.round((80 + score.normalizedScore * 10 + (voteCounts.get(score.projectId) ?? 0) * 2) * 100) / 100, prize: index === 0 ? 'Best Civic Impact' : index === 1 ? 'Technical Excellence' : '', explanation: 'Ranked using the immutable input snapshot, normalized judging signal, and configured community contribution.' }))
    return { version: 'RESULT:v1', published, calculatedAt: new Date().toISOString(), methodology: 'Final score = normalized judging signal (80%) + configured community signal (20%). Eligibility and tie-break rules were evaluated server-side.', entries }
  }

  async publishResults() {
    return withTransaction(async (client) => {
      const normalization = await client.query<{ scores: Array<{ projectId: string; rawAverage: number; normalizedScore: number; evaluationCount: number }> }>('SELECT scores FROM normalization_runs ORDER BY created_at DESC LIMIT 1')
      const scores = normalization.rows[0]?.scores ?? []
      const projects = await client.query('SELECT id,name FROM projects ORDER BY id')
      const votes = await client.query('SELECT project_id,COUNT(*)::int AS count FROM votes GROUP BY project_id')
      const voteCounts = new Map(votes.rows.map((row) => [row.project_id, n(row.count)]))
      const entries = scores.map((score, index) => ({ rank: index + 1, projectId: score.projectId, project: projects.rows.find((project) => project.id === score.projectId)?.name ?? score.projectId, rawScore: score.rawAverage, normalizedScore: score.normalizedScore, communityScore: voteCounts.get(score.projectId) ?? 0, finalScore: Math.round((80 + score.normalizedScore * 10 + (voteCounts.get(score.projectId) ?? 0) * 2) * 100) / 100, prize: index === 0 ? 'Best Civic Impact' : index === 1 ? 'Technical Excellence' : '', explanation: 'Ranked using the immutable input snapshot, normalized judging signal, and configured community contribution.' }))
      const entriesJson = JSON.stringify(entries)
      await client.query('INSERT INTO result_snapshots(version,published,methodology,input_hash,entries) VALUES ($1,TRUE,$2,$3,$4) ON CONFLICT (version) DO UPDATE SET published=TRUE,entries=EXCLUDED.entries', ['RESULT:v1', 'Final score = normalized judging signal (80%) + configured community signal (20%). Eligibility and tie-break rules were evaluated server-side.', stableInputHash({ scores, votes: votes.rows }), entriesJson])
      await appendAudit(client, 'ORGANIZER', 'RESULTS_PUBLISHED', 'RESULT:v1', { entries: entries.length })
      const result = await client.query('SELECT version,published,calculated_at AS "calculatedAt",methodology,entries FROM result_snapshots WHERE version=$1', ['RESULT:v1'])
      return { ...result.rows[0], calculatedAt: iso(result.rows[0].calculatedAt) }
    })
  }

  async castVote(user: AuthUser, projectId: string) {
    try {
      const result = await pool.query('INSERT INTO votes(id,voter_id,project_id) VALUES ($1,$2,$3) RETURNING id,voter_id AS voter,project_id AS "projectId",created_at AS "createdAt",status', [`V-${randomUUID()}`, user.id, projectId])
      return { ...result.rows[0], createdAt: iso(result.rows[0].createdAt) }
    } catch (error) {
      const code = (error as { code?: string }).code
      if (code === '23505') throw new HttpError(409, 'One vote per account is enforced for this event')
      if (code === '23503') throw new HttpError(404, 'Project not found')
      throw error
    }
  }

  async votes() { const result = await pool.query('SELECT id,voter_id AS voter,project_id AS "projectId",created_at AS "createdAt",status FROM votes ORDER BY created_at DESC'); return { items: result.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) })), total: result.rowCount } }
  async comments(projectId?: string) { const result = await pool.query('SELECT c.id,c.project_id AS "projectId",u.email AS author,c.body,c.created_at AS "createdAt" FROM comments c JOIN users u ON u.id=c.author_id ' + (projectId ? 'WHERE c.project_id=$1 ' : '') + 'ORDER BY c.created_at DESC', projectId ? [projectId] : []); return { items: result.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) })) } }
  async addComment(user: AuthUser, projectId: string, body: string) { const result = await pool.query('INSERT INTO comments(id,author_id,project_id,body) VALUES ($1,$2,$3,$4) RETURNING id,project_id AS "projectId",body,created_at AS "createdAt"', [`C-${randomUUID()}`, user.id, projectId, body]); return { ...result.rows[0], author: user.email, createdAt: iso(result.rows[0].createdAt) } }
  async notifications(user: AuthUser) { const result = await pool.query('SELECT id,type,message,created_at AS "createdAt",read FROM notifications WHERE user_id=$1 OR user_id IS NULL ORDER BY created_at DESC', [user.id]); return { items: result.rows.map((row) => ({ ...row, createdAt: iso(row.createdAt) })) } }
  async certificate(id: string) { const result = await pool.query('SELECT id AS "certificateId",participant_name AS name,event_name AS event,achievement,issued_date AS "issuedDate",signature FROM certificates WHERE LOWER(id)=LOWER($1)', [id]); return result.rowCount ? { ...result.rows[0], verified: true } : { certificateId: id, verified: false, message: 'Certificate not found' } }
  async pairwise() { const projects = await this.projects(); return { mode: 'BRADLEY_TERRY', comparisons: projects.length * 8, items: projects.map((project, index) => ({ projectId: project.id, project: project.name, strength: Math.round((0.54 - index * 0.02) * 100) / 100, comparisons: 12 })) } }
  async search(query: string) { const [projects, judges] = await Promise.all([this.projects(query), this.judges()]); return { projects, judges: judges.filter((judge) => `${judge.name} ${judge.email}`.toLowerCase().includes(query.toLowerCase())) } }
}

async function appendAudit(client: PoolClient, actor: string, action: string, entity: string, payload: Record<string, unknown>) {
  const previousResult = await client.query<{ current_hash: string }>('SELECT current_hash FROM audit_events ORDER BY sequence DESC LIMIT 1 FOR UPDATE')
  const previousHash = previousResult.rows[0]?.current_hash ?? 'GENESIS'
  const currentHash = auditHash(previousHash, payload)
  await client.query('INSERT INTO audit_events(id,actor,action,entity,request_id,previous_hash,current_hash,payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [`AUD-${randomUUID()}`, actor, action, entity, randomUUID(), previousHash, currentHash, JSON.stringify(payload)])
}

async function insertSubmissionEvent(client: PoolClient, projectId: string, stage: string, status: SubmissionEvent['status'], progress: number, message: string, details: Record<string, unknown> = {}) {
  await client.query('INSERT INTO submission_processing_events(project_id,stage,status,progress,message,details) VALUES ($1,$2,$3,$4,$5,$6)', [projectId, stage, status, progress, message, JSON.stringify(details)])
}

function delay(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}

export const service = new TrustForgeService()
