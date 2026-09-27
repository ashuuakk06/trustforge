# API guide

Base URL: `/api/v1`.

Public: `GET /gallery`, `GET /certificates/verify?id=...`, `GET /public/certificates/{id}`.

Auth: `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`.

Organizer/admin: `GET /dashboard`, `GET /judges`, `GET /assignments`, `POST /assignments/run`, `GET /anomalies`, `POST /anomalies/{id}/review`, `GET /audit`, `POST /audit/verify`, `POST /normalization/run`, `POST /results/publish`.

Judge: `GET /evaluations`, `POST /evaluations`. The backend rejects unassigned projects and out-of-range scores.

Authenticated flow: `GET /submissions`, `GET /comments`, `POST /comments`, `POST /votes`, `GET /normalization`, `GET /results`, `GET /pairwise`, `GET /notifications`.

Errors use JSON with `timestamp`, `status`, `error`, `message`, and `path`. A request ID is returned in `X-Request-ID`. Swagger UI is generated at `/swagger-ui.html`.
