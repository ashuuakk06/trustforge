# TrustForge

TrustForge is a self-hostable judging integrity layer for hackathons. It follows a project from versioned submission through conflict-aware assignment, rubric evaluation, cross-judge normalization, evidence-led anomaly review, cryptographic audit verification, and reproducible results.

## Run locally

Requirements: Java 25, Maven 3.9+, Node 24+, and npm. The local profile uses an H2 file for a zero-service demo; PostgreSQL is the compose profile used for deployment.

```powershell
cd backend
mvn -Dmaven.repo.local="$pwd/.m2" -Dmaven.test.skip=true package
java -jar target/trustforge-backend-0.1.0.jar
```

In a second terminal:

```powershell
cd frontend
npm install --cache .npm-cache
npm run dev
```

Open http://localhost:5173. The API is at http://localhost:8080 and Swagger UI is at http://localhost:8080/swagger-ui.html.

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

Compose runs PostgreSQL, Redis, the Spring Boot API, and the Nginx-served frontend. Change `JWT_SECRET` before deployment. Docker was not available in the build environment, so compose startup is documented but not claimed as verified here.

## Demo flow

1. Login as organizer and inspect the Overview.
2. Open submissions and the assignment map.
3. Run deterministic assignment and inspect an explanation.
4. Login as a judge and submit an evaluation.
5. Run normalization and inspect means, standard deviations, and score shifts.
6. Review anomaly evidence, verify the audit chain, and inspect the result snapshot.
7. Open the public gallery, vote once, and verify a certificate.

See [ARCHITECTURE.md](ARCHITECTURE.md), [JUDGING.md](JUDGING.md), [THREAT-MODEL.md](THREAT-MODEL.md), and [DEMO.md](DEMO.md).
