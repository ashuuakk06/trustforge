# Deployment

Run `docker compose up --build` to start PostgreSQL, Redis, the API, and the Nginx frontend. Postgres health gates the backend; Redis is also health-checked. Persistent Postgres storage is the `trustforge-postgres` volume.

Set `JWT_SECRET`, `DB_PASSWORD`, and `CORS_ORIGIN` in a deployment secret store. Put TLS termination in front of the stack, restrict the origin, back up PostgreSQL, and configure Redis for distributed rate limits.

The local profile is intentionally simpler: H2 file storage lets a demo run with only Java and Maven. It is not a substitute for the compose/PostgreSQL profile in production.
