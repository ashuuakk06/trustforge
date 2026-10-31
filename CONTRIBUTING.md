# Making changes

I keep the frontend in `frontend/src` and the Spring Boot API in `backend/src/main/java`.

- Keep the assignment and normalization rules deterministic so the demo is repeatable.
- Put database schema changes in a new Flyway migration.
- Keep role checks in the API, even when a page hides a button.
- Update the README or API notes if a route or demo step changes.
- Keep local secrets out of commits.

To build the frontend, run `npm ci` and `npm run build` from `frontend`. To run the backend checks, run `mvn test` from `backend`.
