# Architecture

TrustForge is a modular monolith: one Spring Boot process owns authorization, event lifecycle, judging calculations, and audit writes; one React application consumes versioned REST DTOs. This keeps transactions and reproducibility explicit without introducing operationally expensive microservices.

## Backend

- `api` contains controllers, validation, request IDs, and safe error responses.
- `security` contains HMAC-SHA256 JWT access/refresh handling with rotation and revocation.
- `store` contains the deterministic demo read/write model, isolated so it can be replaced by JPA repositories without changing the API contract.
- `config` contains security, CORS, Actuator, and deployment properties.

The compose profile points Spring at PostgreSQL and runs Flyway. The local default profile uses an H2 file so the demo starts without a database service. Redis is reserved for rate limits, locks, and short-lived state.

## Frontend

React Router defines landing, auth, organizer, judge, gallery, and certificate routes. Shared primitives provide the visual language; pages call `frontend/src/lib/api.ts`, which attaches access tokens and performs one-time refresh rotation on a 401. Security decisions remain backend-enforced.

## Trust pipeline

`SubmissionVersion → Assignment → Evaluation → NormalizationRun → Anomaly → AuditEvent → ResultSnapshot` is the core narrative. Audit hashes use `SHA-256(previousHash + canonicalPayload)` and verification recomputes the sequence from `GENESIS`.

The demo is intentionally a runnable vertical slice. The store is a replaceable persistence adapter rather than a claim that every production table already exists; PostgreSQL/Flyway, Redis, API DTOs, and the documented extension points make the next persistence increment explicit.
