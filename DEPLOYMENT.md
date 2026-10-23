# Deployment

## Local Compose

Run `docker compose up --build` from the project root. Compose starts PostgreSQL, MongoDB, Redis, the Spring Boot API, and the Nginx-served React app. Database and cache health checks gate API startup. The API runs Flyway migrations before accepting requests; the frontend waits for API health.

- Frontend: http://localhost:5174
- API: http://localhost:8081/api/v1
- API health: http://localhost:8081/actuator/health

## Environment

Compose defaults are for local evaluation. Before deployment, provide a strong `JWT_SECRET`, unique database credentials, and a restricted `CORS_ORIGIN` through environment variables or a secrets manager. Terminate TLS at a trusted reverse proxy, restrict public access to database and cache ports, and back up PostgreSQL and MongoDB volumes.

The API uses Flyway migrations and Hibernate schema validation. Do not change Hibernate to create or update schemas in production. Redis is a best-effort dashboard cache; database records remain the source of truth.
