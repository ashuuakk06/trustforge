# Architecture

TrustForge is a modular monolith: one TypeScript Express process owns authorization, event lifecycle, judging calculations, and audit writes; one React/Vite application consumes versioned REST DTOs. This keeps transactions and reproducibility explicit without introducing operationally expensive microservices.

## Backend

- `routes` contains thin HTTP controllers and Zod request schemas.
- `services` contains transaction boundaries and business workflows.
- `core` contains deterministic assignment, normalization, anomaly, and audit algorithms.
- `db` and `migrations` contain PostgreSQL access and versioned SQL schema changes.
- `auth` and `middleware` contain JWT, refresh rotation, role enforcement, rate limiting, request IDs, and safe errors.
- `redis` provides a best-effort short-lived dashboard cache; correctness never depends on it.

Compose starts PostgreSQL, Redis, the API, and Nginx. The API applies SQL migrations at startup and can seed safe demo accounts when `SEED_DEMO=true`. No Java, Maven, H2, or ORM runtime is required.

## Frontend

React Router defines landing, auth, organizer, judge, gallery, and certificate routes. Shared primitives provide the visual language; pages call `frontend/src/lib/api.ts`, which attaches access tokens and performs one-time refresh rotation on a 401. Security decisions remain backend-enforced.

## Trust pipeline

`SubmissionVersion → Assignment → Evaluation → NormalizationRun → Anomaly → AuditEvent → ResultSnapshot` is the core narrative. Audit hashes use `SHA-256(previousHash + canonicalPayload)` and verification recomputes the sequence from `GENESIS`.

The core workflow is persisted in PostgreSQL tables for users, refresh tokens, projects, judges, conflicts, assignments, evaluations, normalization runs, anomalies, votes, comments, audit events, result snapshots, and certificates. Transactions protect assignment replacement, evaluation writes, normalization runs, publication, and audit-chain append operations.
