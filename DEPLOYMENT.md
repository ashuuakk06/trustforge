# Running TrustForge locally

## Docker Compose

Start Docker Desktop and run this from the project folder:

```powershell
docker compose up --build
```

The local demo opens at http://localhost:5174. Its API is available at http://localhost:8081/api/v1. Compose starts PostgreSQL, the API, and the React app. Flyway creates the database schema before the demo data is loaded.

The default database password and JWT secret are intended for local evaluation. For a different local setup, copy `.env.example` to `.env` and change the values there. Do not expose the local defaults outside your computer.

## Run the API and frontend directly

Start the stateful services first:

```powershell
docker compose up -d postgres
```

Run the API from `backend` with the PostgreSQL environment variables from `README.md`. Then run `npm ci` and `npm run dev` from `frontend`. Vite serves the app at http://localhost:5173 and forwards `/api` requests to Spring Boot on port 8080.
