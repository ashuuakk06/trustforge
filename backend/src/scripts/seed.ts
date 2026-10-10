import { randomUUID } from 'node:crypto'

import { hashPassword } from '../auth.js'
import { auditHash, normalizeEvaluations, stableInputHash } from '../core/algorithms.js'
import { closeDatabase, pool, withTransaction } from '../db.js'
import { migrate } from './migrate.js'

const users = [
  ['admin@trustforge.local', 'Asha Rao', 'ADMIN'],
  ['organizer@trustforge.local', 'Maya Chen', 'ORGANIZER'],
  ['judge1@trustforge.local', 'Jordan Ellis', 'JUDGE'],
  ['judge2@trustforge.local', 'Samir Patel', 'JUDGE'],
  ['judge3@trustforge.local', 'Leah Okafor', 'JUDGE'],
  ['judge4@trustforge.local', 'Diego Santos', 'JUDGE'],
  ['participant1@trustforge.local', 'Nia Williams', 'PARTICIPANT'],
  ['participant2@trustforge.local', 'Evan Brooks', 'PARTICIPANT'],
  ['participant3@trustforge.local', 'Priya Shah', 'PARTICIPANT'],
  ['participant4@trustforge.local', 'Noah Kim', 'PARTICIPANT'],
  ['participant5@trustforge.local', 'Luca Martin', 'PARTICIPANT'],
  ['participant6@trustforge.local', 'Ivy Nguyen', 'PARTICIPANT']
] as const

const projects = [
  ['P-023', 'Atlas Civic', 'atlas-civic', 'Civic infrastructure', 'A verifiable permit workflow that gives communities a transparent path from proposal to decision.', 'React · Node.js · PostgreSQL', 'Nia Williams + Evan Brooks', 'atlas-civic'],
  ['P-017', 'GreenTrace', 'greentrace', 'Climate & sustainability', 'A supply-chain emissions ledger that turns small procurement choices into measurable climate action.', 'TypeScript · Redis · PostgreSQL', 'Priya Shah + Luca Martin', 'greentrace'],
  ['P-031', 'Relay Health', 'relay-health', 'Health & accessibility', 'Low-bandwidth care coordination designed for the moments when connectivity is the constraint.', 'React Native · Node.js · SQLite', 'Noah Kim + Ivy Nguyen', 'relay-health'],
  ['P-008', 'Lumen Learn', 'lumen-learn', 'Education', 'A calm, offline-first study companion that makes progress visible without gamifying attention.', 'React · TypeScript · WebAssembly', 'Evan Brooks + Priya Shah', 'lumen-learn'],
  ['P-044', 'OpenShelf', 'openshelf', 'Developer tools', 'A local-first package mirror with provenance, vulnerability context, and one-click rollback.', 'Node.js · React · OCI', 'Luca Martin + Nia Williams', 'openshelf'],
  ['P-052', 'Signal Garden', 'signal-garden', 'Community', 'A neighborhood signal board that lets residents turn recurring friction into collective action.', 'Next.js · PostgreSQL · Redis', 'Ivy Nguyen + Noah Kim', 'signal-garden']
] as const

export async function seed() {
  await migrate()
  await withTransaction(async (client) => {
    const existing = await client.query('SELECT COUNT(*)::int AS count FROM users')
    if ((existing.rows[0]?.count ?? 0) > 0) return
    const passwordHash = await hashPassword('trustforge')
    const ids = new Map<string, string>()
    for (const [email, name, role] of users) {
      const id = `USR-${email.split('@')[0]}`
      ids.set(email, id)
      await client.query('INSERT INTO users(id,email,name,role,password_hash) VALUES ($1,$2,$3,$4,$5)', [id, email, name, role, passwordHash])
    }
    await client.query('INSERT INTO events(id,name,state,starts_at,submission_deadline,judging_deadline) VALUES ($1,$2,$3,$4,$5,$6)', ['trustforge-demo', 'TrustForge Demo Hackathon', 'JUDGING', '2026-09-24T09:00:00Z', '2026-09-26T09:00:00Z', '2026-09-28T09:00:00Z'])
    for (const [id, name, slug, track, description, technology, team, repo] of projects) {
      await client.query('INSERT INTO projects(id,event_id,name,slug,track,description,technology,team,repository,demo) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [id, 'trustforge-demo', name, slug, track, description, technology, team, `https://github.com/trustforge-demo/${repo}`, `https://demo.trustforge.local/${slug}`])
    }
    const judgeSpecs = [['J-104', 'judge1@trustforge.local', 20, 'High scorer'], ['J-105', 'judge2@trustforge.local', 20, 'Strict scorer'], ['J-106', 'judge3@trustforge.local', 20, 'Balanced scorer'], ['J-107', 'judge4@trustforge.local', 20, 'Fast reviewer']] as const
    for (const [id, email, capacity, tendency] of judgeSpecs) await client.query('INSERT INTO judges(id,user_id,capacity,tendency) VALUES ($1,$2,$3,$4)', [id, ids.get(email), capacity, tendency])
    await client.query('INSERT INTO judge_conflicts(judge_id,project_id,reason) VALUES ($1,$2,$3)', ['J-105', 'P-052', 'Declared conflict of interest'])
    const judgeIds = ['J-104', 'J-105', 'J-106', 'J-107']
    let assignmentNumber = 1
    for (const [projectId] of projects) {
      for (const judgeId of judgeIds) {
        if ((judgeId === 'J-105' && projectId === 'P-052') || (judgeId === 'J-107' && projectId === 'P-031')) continue
        await client.query('INSERT INTO assignments(id,judge_id,project_id,fairness_score,explanation,algorithm_version,seed) VALUES ($1,$2,$3,$4,$5,$6,$7)', [`AS-${assignmentNumber++}`, judgeId, projectId, judgeId === 'J-104' ? 0.94 : 0.89, 'Eligible; no conflict; capacity within limit; coverage satisfied', 'v2.0', '8f91c7'])
      }
    }
    const bases = [91, 87, 84, 81, 78, 75]
    let evaluationNumber = 1
    for (let index = 0; index < projects.length; index++) {
      const project = projects[index]!
      const projectId = project[0]
      const offsets = [5, -7, 0, 2]
      for (let judgeIndex = 0; judgeIndex < judgeIds.length; judgeIndex++) {
        const judgeId = judgeIds[judgeIndex]
        if ((judgeId === 'J-107' && (projectId === 'P-031' || projectId === 'P-052')) || (judgeId === 'J-105' && projectId === 'P-052')) continue
        const raw = Math.max(0, Math.min(100, bases[index]! + offsets[judgeIndex]!))
        const average = raw / 10
        const scores = { innovation: average + 0.2, technicalQuality: average, impact: average - 0.2, ux: average - 0.1, feasibility: average + 0.1 }
        await client.query('INSERT INTO evaluations(id,judge_id,project_id,submission_version,rubric_version,scores,raw_score,weighted_score,comment,duration_seconds) VALUES ($1,$2,$3,1,$4,$5,$6,$7,$8,$9)', [`E-${String(evaluationNumber++).padStart(3, '0')}`, judgeId, projectId, 'RUBRIC:v3', JSON.stringify(scores), raw, raw, 'Seeded evidence note', 420 + index * 37])
      }
    }
    await client.query('INSERT INTO certificates(id,participant_name,event_name,achievement,issued_date,signature) VALUES ($1,$2,$3,$4,$5,$6)', ['TF-2026-001', 'Nia Williams', 'TrustForge Demo Hackathon', 'Best Civic Impact', '2026-09-26', 'Ed25519 / local demo issuer'])
    await client.query('INSERT INTO votes(id,voter_id,project_id) VALUES ($1,$2,$3),($4,$5,$6)', ['V-001', ids.get('participant1@trustforge.local'), 'P-023', 'V-002', ids.get('participant2@trustforge.local'), 'P-017'])
    await client.query('INSERT INTO comments(id,author_id,project_id,body) VALUES ($1,$2,$3,$4)', ['C-001', ids.get('participant3@trustforge.local'), 'P-023', 'The audit trail is a beautiful answer to a real trust problem.'])
    const seedPayload = { name: 'TrustForge Demo Hackathon', state: 'JUDGING' }
    await client.query('INSERT INTO audit_events(id,actor,action,entity,request_id,previous_hash,current_hash,payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', ['AUD-001', 'SYSTEM', 'EVENT_CREATED', 'EVENT:trustforge-demo', randomUUID(), 'GENESIS', auditHash('GENESIS', seedPayload), JSON.stringify(seedPayload)])
  })
  const [evaluationRows, projectRows, judgeRows] = await Promise.all([
    pool.query('SELECT id,judge_id AS "judgeId",project_id AS "projectId",submission_version AS "submissionVersion",rubric_version AS "rubricVersion",scores,raw_score::float AS "rawScore",weighted_score::float AS "weightedScore",comment,status,duration_seconds AS "durationSeconds",submitted_at AS "submittedAt" FROM evaluations'),
    pool.query('SELECT id FROM projects ORDER BY id'),
    pool.query('SELECT id FROM judges ORDER BY id')
  ])
  const computed = normalizeEvaluations(evaluationRows.rows.map((row) => ({ ...row, submittedAt: String(row.submittedAt) })), projectRows.rows.map((row) => row.id), judgeRows.rows.map((row) => row.id))
  await withTransaction(async (client) => {
    const runId = 'N-SEED'
    await client.query('INSERT INTO normalization_runs(id,method,algorithm_version,actor,judge_stats,scores,input_hash) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING', [runId, 'Z_SCORE', 'normalization-v1.0', 'SYSTEM', JSON.stringify(computed.judgeStats), JSON.stringify(computed.scores), stableInputHash({ evaluations: evaluationRows.rows, projects: projectRows.rows, judges: judgeRows.rows })])
    for (const [index, anomaly] of computed.anomalies.entries()) await client.query('INSERT INTO anomalies(id,run_id,type,severity,judge_id,project_id,observed,baseline,confidence,evidence) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING', [`A-SEED-${index + 1}`, runId, 'PROJECT_SPECIFIC_DEVIATION', anomaly.severity, anomaly.judgeId, anomaly.projectId, anomaly.observed, 0.3, anomaly.confidence, 'Score differs from this judge\'s observed scoring distribution; review context before taking action.'])
    const payload = { method: 'z-score', evaluations: evaluationRows.rowCount, algorithmVersion: 'normalization-v1.0' }
    const previous = (await client.query<{ current_hash: string }>('SELECT current_hash FROM audit_events ORDER BY sequence DESC LIMIT 1')).rows[0]?.current_hash ?? 'GENESIS'
    await client.query('INSERT INTO audit_events(id,actor,action,entity,request_id,previous_hash,current_hash,payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING', ['AUD-002', 'SYSTEM', 'NORMALIZATION_COMPLETED', runId, randomUUID(), previous, auditHash(previous, payload), JSON.stringify(payload)])
  })
}

if (process.argv[1]?.endsWith('seed.ts')) seed().then(closeDatabase).catch(async (error) => { console.error(error); await closeDatabase(); process.exitCode = 1 })
