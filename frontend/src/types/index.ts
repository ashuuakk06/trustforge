export type User = { email: string; name: string; role: string; active: boolean }
export type Project = { id: string; name: string; track: string; description: string; technology: string; team: string; repository: string; demo: string; status: string; version: number }
export type AuditEvent = { id: string; actor: string; action: string; entity: string; timestamp: string; requestId: string; previousHash: string; currentHash: string; verificationStatus: string; payload: Record<string, unknown> }
export type NormalizedScore = { projectId: string; rawAverage: number; normalizedScore: number; evaluationCount: number }
export type ApiError = { message?: string; error?: string }
export type SubmissionDraft = { name:string; track:string; description:string; problemStatement:string; solution:string; technology:string; team:string; repository:string; demo:string; supportingLinks?:string[] }
export type SubmissionEvent = { sequence:number; projectId:string; stage:string; status:'RUNNING'|'COMPLETED'|'FAILED'; progress:number; message:string; details:Record<string,unknown>; createdAt:string }
export type SubmissionResponse = { submissionId:string; status:string; streamUrl:string; submission:Project & { processingStatus:string; contentHash?:string|null; events?:SubmissionEvent[] } }
