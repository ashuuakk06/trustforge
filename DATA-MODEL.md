# Data model

The deployment schema is designed around these aggregates. The local demo exposes the same concepts through a deterministic adapter so the judging narrative runs without a database service.

| Aggregate | Purpose | Important constraints |
|---|---|---|
| User / Role | identity and role isolation | unique email, hashed password, active status |
| Event | lifecycle, dates, tracks, prizes | state transition policy, server time |
| Team / TeamMember | participant grouping | event membership constraints |
| Submission / SubmissionVersion | project content and immutable review target | unique version, content hash |
| Judge / JudgeConflict | judging profile and conflicts | conflict excludes assignment |
| JudgeAssignment | explainable coverage match | unique judge/project, capacity and coverage |
| Rubric / RubricVersion / Criterion | versioned scoring policy | weights total 100%; immutable after start |
| Evaluation / EvaluationScore | judge review against a version | score bounds, assignment check |
| NormalizationRun / NormalizedScore | reproducible comparison | algorithm version, sample size, edge policy |
| Anomaly / VoteFlag | review workflow | evidence and status; no automatic accusation |
| Vote / Comment | public interaction | one vote per event/account, moderation/audit |
| AuditEvent / AuditChain | tamper-evident history | previous/current SHA-256 hash |
| ResultSnapshot / ResultEntry | immutable ranking calculation | published versions cannot mutate in place |
| RefreshToken | session continuity | revocation and one-time consume |
| Certificate / JudgeParticipationRecord | local signed verification | public ID and signature status |
| Webhook / WebhookDelivery | API integration | retry, backoff, signature, delivery log |

Indexes belong on event/state, submission slug, assignment judge/project, evaluation project/judge, audit timestamp/hash, vote event/voter, and result version. Imports validate every row before committing a batch.
