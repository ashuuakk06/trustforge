# Architecture

TrustForge is a modular full-stack application. The React client calls a stateless Spring Boot REST API. PostgreSQL stores transactional event data; MongoDB stores the submission processing timeline; Redis is a short-lived cache for the dashboard.

## Request path

```text
React + Vite → Nginx → Spring Boot REST API
                           ├── Spring Security + JWT
                           ├── Spring Data JPA / Hibernate → PostgreSQL
                           ├── MongoRepository → MongoDB
                           └── Redis → optional dashboard cache
```

## Backend

- `web` contains validated REST request/response handling and API errors.
- `security` issues short-lived JWT access tokens, rotates hashed refresh tokens, and enforces roles.
- `persistence` maps the core relational model with JPA entities and repositories. Flyway owns schema changes in `src/main/resources/db/migration`.
- `core` contains deterministic conflict-aware assignment, z-score normalization, and stable hashing.
- `platform` calculates dashboards, results, and cross-cutting workflows.
- `submissions` persists project records in PostgreSQL, records processing stages in MongoDB, and streams them to the browser with Server-Sent Events.
- `seed` creates the local demo event and accounts when the database is empty and `SEED_DEMO=true`.

Passwords are BCrypt hashes. Refresh tokens are stored as SHA-256 hashes, rotated on use, and revoked as a family when reuse is detected. Sensitive workflows append SHA-256 hash-chain events to PostgreSQL.

## Frontend

The Vite and React application keeps the organizer, judge, participant, gallery, certificate, and results screens. `frontend/src/lib/api.ts` attaches the bearer token and rotates the refresh token after an expired access token. Security checks remain on the API.

## Core workflow

`Submission → Assignment → Evaluation → Normalization → Anomaly Review → Audit → Result Snapshot`

The assignment engine excludes declared conflicts and respects judge capacity. Normalization keeps raw scores and computes a z-score signal using each judge's mean and sample standard deviation. A zero standard deviation uses a stable unit denominator. Anomaly signals are for human review and never automatically disqualify a judge.
