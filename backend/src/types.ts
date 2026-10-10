export type Role = 'ADMIN' | 'ORGANIZER' | 'JUDGE' | 'PARTICIPANT'

export type AuthUser = {
  id: string
  email: string
  name: string
  role: Role
  active: boolean
}

export type ProjectRecord = {
  id: string
  name: string
  slug: string
  track: string
  description: string
  technology: string
  team: string
  repository: string
  demo: string
  status: string
  version: number
}

export type JudgeRecord = {
  id: string
  name: string
  email: string
  capacity: number
  tendency: string
  conflicts: string[]
}

export type EvaluationRecord = {
  id: string
  judgeId: string
  projectId: string
  submissionVersion: number
  rubricVersion: string
  scores: Record<string, number>
  rawScore: number
  weightedScore: number
  comment: string
  status: string
  durationSeconds: number
  submittedAt: string
}

export type SubmissionInput = {
  name: string
  track: string
  description: string
  problemStatement: string
  solution: string
  technology: string
  team: string
  repository: string
  demo: string
  supportingLinks?: string[]
}

export type SubmissionEvent = {
  sequence: number
  projectId: string
  stage: string
  status: 'RUNNING' | 'COMPLETED' | 'FAILED'
  progress: number
  message: string
  details: Record<string, unknown>
  createdAt: string
}

export type AssignmentInput = {
  judgeId: string
  capacity: number
  conflicts: Set<string>
}

export type AssignmentResult = {
  assignments: Array<{
    id: string
    judgeId: string
    projectId: string
    status: 'ASSIGNED'
    fairnessScore: number
    explanation: string
    algorithmVersion: string
    seed: string
  }>
  infeasible: string[]
  metrics: Record<string, unknown>
}
