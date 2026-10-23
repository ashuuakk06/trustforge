# TrustForge — Hackathon Judging Platform

TrustForge is a full-stack platform for hackathon submissions, conflict-aware judge assignments, rubric scoring, score normalization, result publication, and tamper-evident audit history.

## Run the full application

Requirements: Docker Desktop with Docker Compose enabled.

```powershell
docker compose up --build
```

On first startup, Compose builds the Spring Boot API and React app. Flyway creates the PostgreSQL schema, then the API loads demo accounts, submissions, assignments, evaluations, and results. Wait until the `backend` and `frontend` services are healthy.

- Web app: http://localhost:5174
- REST API: http://localhost:8081/api/v1
- Health: http://localhost:8081/actuator/health

Stop the app with `Ctrl+C`. To run it in the background, use `docker compose up --build -d`; view logs with `docker compose logs -f backend frontend`.

## Demo accounts

All seeded accounts use `trustforge` as the password.

| Account | Role |
|---|---|
| admin@trustforge.local | ADMIN |
| organizer@trustforge.local | ORGANIZER |
| judge1@trustforge.local | JUDGE |
| judge2@trustforge.local | JUDGE |
| participant1@trustforge.local | PARTICIPANT |

## Demo flow

1. Sign in as `organizer@trustforge.local` and review the event dashboard.
2. Run conflict-aware assignments and inspect each judge/project match.
3. Sign in as `judge1@trustforge.local` and submit rubric scores for an assigned project.
4. Re-run normalization to see per-judge z-score adjustments and anomaly evidence.
5. Verify the audit hash chain, then publish the final results.
6. Explore the public gallery, cast a one-account vote, and verify `TF-2026-001`.
7. Sign in as `participant1@trustforge.local` to submit a project and follow its live processing timeline.

## Run locally without Dockerizing the app

Start only the stateful services from the project root:

```powershell
docker compose up -d postgres mongo redis
```

In one terminal, start the API:

```powershell
cd backend
$env:DB_HOST='localhost'; $env:DB_PORT='5433'; $env:REDIS_PORT='6380'
$env:MONGODB_URI='mongodb://localhost:27017/trustforge'
mvn spring-boot:run
```

In another terminal, start the React app:

```powershell
cd frontend
npm ci
npm run dev
```

Open http://localhost:5173. Vite proxies `/api` requests to the local API on port 8080. Flyway and the demo-data initializer run automatically when the API starts.

## Stack

- **Backend:** Java 21, Spring Boot, Spring Security, Spring Data JPA, Hibernate, REST, JWT
- **Frontend:** React, TypeScript, JavaScript, HTML, CSS, Vite
- **Data:** PostgreSQL, Flyway, MongoDB, Redis
- **Quality and delivery:** JUnit 5, Mockito, Maven, Git, GitHub, Docker, Docker Compose

Relational workflow data is stored in PostgreSQL. Submission processing events are stored in MongoDB and streamed to React using Server-Sent Events. Redis briefly caches the dashboard and falls back to PostgreSQL when unavailable.

See [API.md](API.md), [ARCHITECTURE.md](ARCHITECTURE.md), [DATA-MODEL.md](DATA-MODEL.md), [DEMO.md](DEMO.md), and [DEPLOYMENT.md](DEPLOYMENT.md).
