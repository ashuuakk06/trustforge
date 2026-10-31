# Local acceptance notes

Start the project from its root folder with `docker compose up --build`, then open `http://localhost:5174`.

For a quick manual walkthrough, use the demo accounts in the main README and check:

1. The public gallery loads.
2. An organizer can open the dashboard, assignments, normalization, audit history, and results.
3. A judge can open assigned projects and save an evaluation.
4. A participant can open the submission page.
5. The certificate page finds `TF-2026-001`.
6. The API health endpoint at `http://localhost:8081/actuator/health` reports `UP`.

The current local build and the checks performed for it are recorded in `acceptance-report.txt`. That report lists only checks that were actually run.
