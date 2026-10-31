# How TrustForge works

The React and TypeScript frontend calls a Spring Boot REST API. Spring Security verifies JWT access tokens and checks permissions before the API reads or changes event data.

```text
React + TypeScript
        ↓ JSON over REST
Spring Boot API
        ↓ Spring Data JPA / JDBC
PostgreSQL ← Flyway migrations
```

## Backend folders

- `web` contains API controllers, request validation, and error responses.
- `security` handles login, JWT access tokens, refresh tokens, and role checks.
- `persistence` contains PostgreSQL entities and repositories.
- `core` contains judge assignment and score normalization calculations.
- `platform` builds dashboard, judging, audit, and results responses from PostgreSQL.
- `submissions` saves projects and records their processing steps.
- `seed` adds sample accounts and event data for the local demo.

Flyway scripts in `backend/src/main/resources/db/migration` define the database schema. JPA validates the mapped tables when the API starts.

## Submission flow

1. The participant form sends project details to the API.
2. The API saves the project and its initial status event in PostgreSQL.
3. The processor checks required fields and creates a SHA-256 fingerprint of the project details.
4. Each processing step is saved to `submission_processing_events` in PostgreSQL.
5. The browser polls `/api/v1/submissions/{id}/events` and asks for events after the last sequence it received.
6. The API marks the submission ready for judging and appends an audit event.

The dashboard reads current values from PostgreSQL on each request. No separate cache is needed for this local demo.

## Judging flow

```text
Submission → Judge assignment → Rubric score → Normalization → Human review → Results
```

The assignment code skips declared conflicts and favors judges with fewer current assignments. A seeded hash only resolves equal-load ties so the sample event stays repeatable. Normalization compares each judge's scores with that judge's own average. Review flags do not change a score or decide misconduct.

Results use the raw judging average (70%) and a community vote score (30%). The normalization value is shown alongside the result to explain scoring patterns; it is not used as a hidden second ranking formula.
