# Deployment

Run `docker compose up --build` to start PostgreSQL, Redis, the TypeScript API, and the Nginx frontend. Postgres health gates the backend; Redis is also health-checked. Persistent Postgres storage is the `trustforge-postgres` volume.

Set `JWT_SECRET`, `DB_PASSWORD`, and `CORS_ORIGIN` in a deployment secret store. Put TLS termination in front of the stack, restrict the origin, back up PostgreSQL, and configure Redis for distributed rate limits.

The local profile uses the same PostgreSQL schema and can run with `npm run migrate`, `npm run seed`, and `npm run dev`. There is no alternate in-memory or Java runtime path.
