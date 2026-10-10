import crypto from 'node:crypto'

import type { AssignmentInput, AssignmentResult, EvaluationRecord } from '../types.js'

export const RUBRIC = [
  { name: 'Innovation', key: 'innovation', weight: 20, min: 0, max: 10 },
  { name: 'Technical Quality', key: 'technicalQuality', weight: 25, min: 0, max: 10 },
  { name: 'Impact', key: 'impact', weight: 20, min: 0, max: 10 },
  { name: 'UX', key: 'ux', weight: 15, min: 0, max: 10 },
  { name: 'Feasibility', key: 'feasibility', weight: 20, min: 0, max: 10 }
] as const

const round = (value: number) => Math.round(value * 100) / 100

function stableScore(seed: string, value: string): number {
  const digest = crypto.createHash('sha256').update(`${seed}:${value}`).digest()
  return digest.readUInt32BE(0) / 0xffffffff
}

export function assignJudges(
  judges: AssignmentInput[],
  projectIds: string[],
  minimumCoverage = 3,
  seed = '8f91c7'
): AssignmentResult {
  const loads = new Map(judges.map((judge) => [judge.judgeId, 0]))
  const chosen = new Set<string>()
  const assignments: AssignmentResult['assignments'] = []
  const infeasible: string[] = []

  for (const projectId of projectIds) {
    const eligible = judges
      .filter((judge) => !judge.conflicts.has(projectId) && (loads.get(judge.judgeId) ?? 0) < judge.capacity)
      .sort((a, b) => {
        const loadDelta = (loads.get(a.judgeId) ?? 0) - (loads.get(b.judgeId) ?? 0)
        return loadDelta || stableScore(seed, `${projectId}:${a.judgeId}`) - stableScore(seed, `${projectId}:${b.judgeId}`)
      })

    const target = Math.min(minimumCoverage, eligible.length)
    if (eligible.length < minimumCoverage) infeasible.push(`${projectId}: only ${eligible.length} eligible judges; required ${minimumCoverage}`)

    for (const judge of eligible.slice(0, target)) {
      const key = `${judge.judgeId}:${projectId}`
      if (chosen.has(key)) continue
      const load = loads.get(judge.judgeId) ?? 0
      loads.set(judge.judgeId, load + 1)
      chosen.add(key)
      assignments.push({
        id: `AS-${assignments.length + 1}`,
        judgeId: judge.judgeId,
        projectId,
        status: 'ASSIGNED',
        fairnessScore: round(Math.max(0.5, 1 - load / Math.max(1, judge.capacity))),
        explanation: `Eligible; no declared conflict; workload ${load}/${judge.capacity}; coverage target ${target}/${minimumCoverage}`,
        algorithmVersion: 'v2.0',
        seed
      })
    }
  }

  const counts = Object.fromEntries([...loads.entries()].map(([id, count]) => [id, count]))
  const coverage = projectIds.length === 0 ? 100 : round(projectIds.filter((id) => assignments.some((item) => item.projectId === id)).length * 100 / projectIds.length)
  const values = [...loads.values()]
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, values.length)
  return {
    assignments,
    infeasible,
    metrics: {
      workloadVariance: round(variance),
      coverageRate: coverage,
      conflictRate: projectIds.length === 0 ? 0 : round((projectIds.length * judges.length - assignments.length) / Math.max(1, projectIds.length * judges.length) * 100),
      judgeUtilization: round(assignments.length * 100 / Math.max(1, judges.reduce((sum, judge) => sum + judge.capacity, 0))),
      minimumCoverage,
      maximumCoverage: Math.max(0, ...projectIds.map((id) => assignments.filter((item) => item.projectId === id).length)),
      byJudge: counts
    }
  }
}

export type NormalizationResult = {
  judgeStats: Record<string, { mean: number; standardDeviation: number; sampleSize: number }>
  scores: Array<{ projectId: string; rawAverage: number; normalizedScore: number; evaluationCount: number }>
  anomalies: Array<{ judgeId: string; projectId: string; observed: number; severity: string; confidence: number }>
}

export function normalizeEvaluations(evaluations: EvaluationRecord[], projectIds: string[], judgeIds: string[]): NormalizationResult {
  const judgeStats: NormalizationResult['judgeStats'] = {}
  for (const judgeId of judgeIds) {
    const values = evaluations.filter((item) => item.judgeId === judgeId).map((item) => item.rawScore)
    const mean = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
    const variance = values.length > 1 ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1) : 0
    judgeStats[judgeId] = { mean: round(mean), standardDeviation: round(Math.sqrt(variance) || 1), sampleSize: values.length }
  }
  const scores = projectIds.map((projectId) => {
    const items = evaluations.filter((item) => item.projectId === projectId)
    const rawAverage = items.length ? items.reduce((sum, item) => sum + item.rawScore, 0) / items.length : 0
    const normalizedScore = items.length ? items.reduce((sum, item) => {
      const stats = judgeStats[item.judgeId] ?? { mean: 0, standardDeviation: 1, sampleSize: 0 }
      return sum + (item.rawScore - stats.mean) / stats.standardDeviation
    }, 0) / items.length : 0
    return { projectId, rawAverage: round(rawAverage), normalizedScore: round(normalizedScore), evaluationCount: items.length }
  }).sort((a, b) => b.normalizedScore - a.normalizedScore)

  const anomalies = evaluations.flatMap((item) => {
    const stats = judgeStats[item.judgeId]
    if (!stats) return []
    const observed = (item.rawScore - stats.mean) / stats.standardDeviation
    if (Math.abs(observed) <= 1.55) return []
    return [{ judgeId: item.judgeId, projectId: item.projectId, observed: round(observed), severity: Math.abs(observed) > 2 ? 'HIGH' : 'MEDIUM', confidence: round(Math.min(0.99, 0.72 + Math.abs(observed) / 10)) }]
  })
  return { judgeStats, scores, anomalies }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function auditHash(previousHash: string, payload: unknown): string {
  return crypto.createHash('sha256').update(`${previousHash}${canonicalJson(payload)}`).digest('hex')
}

export function stableInputHash(value: unknown): string {
  return crypto.createHash('sha256').update(canonicalJson(value)).digest('hex')
}
