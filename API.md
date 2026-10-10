# API guide

Base URL: `/api/v1`.

Public: `GET /gallery`, `GET /certificates/verify?id=...`, `GET /public/certificates/{id}`.

Auth: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.

Organizer/admin: `GET /dashboard`, `GET /judges`, `GET /assignments`, `POST /assignments/run`, `GET /anomalies`, `POST /anomalies/{id}/review`, `GET /audit`, `POST /audit/verify`, `POST /normalization/run`, `POST /results/publish`.

Judge: `GET /evaluations`, `POST /evaluations`. The backend rejects unassigned projects and out-of-range scores.

Authenticated flow: `GET /submissions`, `POST /submissions`, `GET /submissions/{id}`, `GET /submissions/{id}/events`, `GET /comments`, `POST /comments`, `POST /votes`, `GET /normalization`, `GET /results`, `GET /pairwise`, `GET /notifications`.

`POST /submissions` accepts the project details and returns `202 Accepted` with a submission ID. Processing continues in the background through validation, content hashing, persistence, audit chaining, and readiness for judging. `GET /submissions/{id}/events` is an authenticated Server-Sent Events stream; each event is persisted in PostgreSQL and includes the stage, status, progress, message, and timestamp so a client can reconnect and replay the current submission history.

Errors use JSON with `error`, `message`, and `requestId`. Every response includes an `X-Request-ID` header. Authentication uses a short-lived JWT access token plus one-time rotating refresh tokens.

The API validates JSON bodies with Zod and returns `401` for missing/invalid authentication, `403` for role or assignment violations, `409` for duplicate votes, and `422` for invalid rubric scores.
