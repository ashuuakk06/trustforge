# TrustForge

TrustForge is a self-hostable judging integrity layer for hackathons. It follows a project from versioned submission through conflict-aware assignment, rubric evaluation, cross-judge normalization, evidence-led anomaly review, cryptographic audit verification, and reproducible results.

## Run locally

Requirements: Node 20+, npm, PostgreSQL 16+, and Redis 7+. The active runtime is a TypeScript Express modular monolith. PostgreSQL is the source of truth; Redis is optional for local development and used for short-lived dashboard caching.

```powershell
Copy-Item backend/.env.example backend/.env
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

In a second terminal:

```powershell
cd frontend
npm install --cache .npm-cache
npm run dev
```

Open http://localhost:5173. The API is at http://localhost:8080 and its health endpoint is http://localhost:8080/health.

## Demo accounts

All development accounts use `trustforge` as the password.

| Account | Role |
|---|---|
| admin@trustforge.local | ADMIN |
| organizer@trustforge.local | ORGANIZER |
| judge1@trustforge.local | JUDGE |
| judge2@trustforge.local | JUDGE |
| participant1@trustforge.local | PARTICIPANT |

## Docker

```powershell
docker compose up --build
```

Compose runs PostgreSQL, Redis, the TypeScript Express API, and the Nginx-served frontend. Change `JWT_SECRET` before deployment.

## Demo flow

1. Login as organizer and inspect the Overview.
2. Open submissions, create a project, and watch the live processing timeline update as the backend validates, hashes, persists, and audits it.
3. Run deterministic assignment and inspect an explanation.
4. Login as a judge and submit an evaluation.
5. Run normalization and inspect means, standard deviations, and score shifts.
6. Review anomaly evidence, verify the audit chain, and inspect the result snapshot.
7. Open the public gallery, vote once, and verify a certificate.

See [ARCHITECTURE.md](ARCHITECTURE.md), [API.md](API.md), [SECURITY.md](SECURITY.md), [JUDGING.md](JUDGING.md), [THREAT-MODEL.md](THREAT-MODEL.md), and [DEMO.md](DEMO.md).
