export type User = { email: string; name: string; role: string; active: boolean }
export type Project = { id: string; name: string; track: string; description: string; technology: string; team: string; repository: string; demo: string; status: string; version: number }
export type AuditEvent = { id: string; actor: string; action: string; entity: string; timestamp: string; requestId: string; previousHash: string; currentHash: string; verificationStatus: string; payload: Record<string, unknown> }
export type NormalizedScore = { projectId: string; rawAverage: number; normalizedScore: number; evaluationCount: number }
export type ApiError = { message?: string; error?: string }
