# TrustForge

TrustForge is my third-year BTech project: a hackathon judging platform that follows a submission from entry to published results. Participants submit projects, organizers assign judges, judges score with a shared rubric, and organizers can review the audit history before publishing a result snapshot.

The scoring and review signals use explainable Java rules. The app does not use an AI service, and an unusual score is only a prompt for human review.

## Features

- Role-based accounts for organizers, judges, and participants.
- Conflict-aware judge assignment with workload balancing and coverage warnings.
- Weighted rubric scoring, per-judge score normalization, and review flags.
- SHA-256 project fingerprints and a verifiable audit hash chain.
- Project gallery, one-account community voting, result snapshots, and certificate lookup.
- PostgreSQL storage managed by Flyway, including submission processing events.
- Responsive React pages with Framer Motion transitions and Recharts visualizations.

## Technology

- **Backend:** Java 21, Spring Boot, Spring Security, Spring Data JPA, JWT, Flyway
- **Database:** PostgreSQL
- **Frontend:** React, TypeScript, Vite, Framer Motion, Recharts, CSS
- **Local development:** Maven, npm, Docker Compose

## Run the demo with Docker Compose

Start Docker Desktop and run this from the project folder:

```powershell
docker compose up --build
```

Open **http://localhost:5174**. The API is available at **http://localhost:8081/api/v1** and its health check is **http://localhost:8081/actuator/health**. Compose starts PostgreSQL, the API, and the frontend. Flyway prepares the schema before the sample data is loaded.

For a clean demo database, stop the stack and remove only the project volume with `docker compose down -v` before starting it again. The default database password and JWT secret are for local evaluation; change them before exposing the app to a network.

### Demo accounts

All demo accounts use the password `trustforge`.

| Role | Email |
| --- | --- |
| Organizer | `organizer@trustforge.local` |
| Judge | `judge1@trustforge.local` |
| Participant | `participant1@trustforge.local` |
| Admin | `admin@trustforge.local` |

### Walkthrough

1. Sign in as the organizer and review the dashboard.
2. Open **Judging** to inspect assignments, then run the assignment step if needed.
3. Sign in as a judge and submit a rubric evaluation.
4. Review **Normalization**, **Integrity**, and the **Audit explorer**.
5. Publish results and open the public gallery.
6. Verify certificate `TF-2026-001`.
7. Sign in as a participant and submit a project to see the status history update through polling.

## Run the API and frontend separately

Start PostgreSQL in Docker:

```powershell
docker compose up -d postgres
```

From `backend`, run the API:

```powershell
$env:DB_HOST='localhost'; $env:DB_PORT='5433'; $env:DB_NAME='trustforge'
$env:DB_USER='trustforge'; $env:DB_PASSWORD='trustforge-local'
mvn spring-boot:run
```

In another terminal, from `frontend`, run the development server:

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173**. Vite forwards `/api` requests to Spring Boot on port 8080.

## Checks

Run the backend test suite from `backend`:

```powershell
mvn test
```

Build and type-check the frontend from `frontend`:

```powershell
npm ci
npm run build
```

## Data and architecture

PostgreSQL stores accounts, events, projects, submission processing events, judging records, result snapshots, and audit history. Flyway migrations are in `backend/src/main/resources/db/migration`. Dashboard values are read directly from PostgreSQL. The frontend checks the submission status API on a short interval and requests only events after the last sequence it received.

See [architecture](ARCHITECTURE.md), [API routes](API.md), [data model](DATA-MODEL.md), [judging calculations](JUDGING.md), and [deployment notes](DEPLOYMENT.md) for more detail.
