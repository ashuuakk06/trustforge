# REST API

Base path: `/api/v1`. Protected routes use `Authorization: Bearer <accessToken>`. Login and registration return a short-lived access token, a rotating refresh token, and a public user profile.

## Authentication

- `POST /auth/login` — email and password
- `POST /auth/register` — creates a participant account
- `POST /auth/refresh` — rotates a refresh token; reuse revokes its token family
- `POST /auth/logout` — revokes the supplied refresh token
- `GET /auth/me` — current user

## Event and submission

- `GET /events`, `GET /dashboard`
- `GET /submissions?q=...`, `POST /submissions`
- `GET /submissions/{id}`, `GET /submissions/{id}/events` (Server-Sent Events)
- `GET /gallery?q=...`

Submission fields include name, track, description, problemStatement, solution, technology, team, repository, and demo. Processing validates the record, fingerprints its content, marks it ready for judging, and writes an audit event. MongoDB stores the ordered processing timeline.

## Judging and integrity

- `GET /judges`, `GET /assignments`, `POST /assignments/run`
- `GET /evaluations`, `POST /evaluations`
- `GET /normalization`, `GET /normalization/proof`, `POST /normalization/run`
- `GET /anomalies`, `POST /anomalies/{id}/review`
- `GET /audit`, `POST /audit/verify`
- `GET /pairwise`

Assignments, anomaly review, audit, normalization, and publication require the organizer or admin role. Evaluation writes require a judge account assigned to the project.

## Community and results

- `GET /results`, `POST /results/publish`
- `GET /votes`, `POST /votes`
- `GET /comments?projectId=...`, `POST /comments`
- `GET /notifications`
- `GET /certificates/verify?id=...`, `POST /certificates/verify`
- `GET /public/certificates/{id}`
- `GET /search?q=...`

The one-vote-per-account constraint is enforced by PostgreSQL. Published result snapshots include the calculation method, input hash, and ranked entries.

Health endpoints: `/actuator/health` and `/api/v1/health/demo`.
