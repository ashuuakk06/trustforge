import { describe, expect, it } from 'vitest'

import { assignJudges, auditHash, canonicalJson, normalizeEvaluations } from './algorithms.js'

describe('deterministic judge assignment', () => {
  it('excludes conflicts, respects capacity, and reports infeasible coverage', () => {
    const result = assignJudges([
      { judgeId: 'J1', capacity: 2, conflicts: new Set(['P1']) },
      { judgeId: 'J2', capacity: 1, conflicts: new Set() }
    ], ['P1', 'P2'], 2, 'stable-seed')
    expect(result.assignments.some((item) => item.judgeId === 'J1' && item.projectId === 'P1')).toBe(false)
    expect(result.infeasible).toHaveLength(2)
    expect(result.assignments).toEqual(assignJudges([
      { judgeId: 'J1', capacity: 2, conflicts: new Set(['P1']) },
      { judgeId: 'J2', capacity: 1, conflicts: new Set() }
    ], ['P1', 'P2'], 2, 'stable-seed').assignments)
  })
})

describe('score normalization', () => {
  it('handles zero variance with a stable denominator and returns explainable anomalies', () => {
    const result = normalizeEvaluations([
      { id: 'E1', judgeId: 'J1', projectId: 'P1', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 80, weightedScore: 80, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' },
      { id: 'E2', judgeId: 'J1', projectId: 'P2', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 80, weightedScore: 80, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' },
      { id: 'E3', judgeId: 'J2', projectId: 'P1', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 0, weightedScore: 0, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' },
      { id: 'E4', judgeId: 'J2', projectId: 'P2', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 0, weightedScore: 0, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' },
      { id: 'E5', judgeId: 'J2', projectId: 'P1', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 0, weightedScore: 0, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' },
      { id: 'E6', judgeId: 'J2', projectId: 'P2', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 0, weightedScore: 0, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' },
      { id: 'E7', judgeId: 'J2', projectId: 'P1', submissionVersion: 1, rubricVersion: 'R1', scores: {}, rawScore: 100, weightedScore: 100, comment: '', status: 'SUBMITTED', durationSeconds: 1, submittedAt: '' }
    ], ['P1', 'P2'], ['J1', 'J2'])
    expect(result.judgeStats.J1?.standardDeviation).toBe(1)
    expect(result.scores).toHaveLength(2)
    expect(result.anomalies.length).toBeGreaterThan(0)
  })
})

describe('audit canonicalization', () => {
  it('is key-order independent and detects changed payloads through the hash', () => {
    const a = { z: 2, a: { b: true, a: 1 } }
    const b = { a: { a: 1, b: true }, z: 2 }
    expect(canonicalJson(a)).toBe(canonicalJson(b))
    expect(auditHash('GENESIS', a)).toBe(auditHash('GENESIS', b))
    expect(auditHash('GENESIS', a)).not.toBe(auditHash('GENESIS', { ...a, z: 3 }))
  })
})
