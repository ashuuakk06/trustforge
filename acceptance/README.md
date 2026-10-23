# Acceptance checks

With the full stack running from the project root, run:

```powershell
./acceptance/smoke.ps1 -BaseUrl http://localhost:8081
```

The script checks the seeded gallery, organizer and judge login, refresh-token rotation and reuse detection, dashboard records, assignment coverage, normalization, audit-chain verification, result snapshots, certificate verification, role isolation, and an evaluation write.

The backend's JUnit 5 and Mockito tests run with `cd backend; mvn test`. The frontend production bundle builds with `cd frontend; npm ci; npm run build`.
