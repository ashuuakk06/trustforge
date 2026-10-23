# Security notes

- Spring Security protects non-public API routes with signed JWT access tokens and role-based method authorization.
- Passwords use BCrypt. Refresh tokens are random, stored as SHA-256 hashes, rotated on use, and revoked as a family if a used token is replayed.
- Request bodies are validated on the API. Judges can only evaluate projects assigned to their judge profile.
- A database uniqueness constraint enforces one community vote per account.
- Audit events form a SHA-256 hash chain. The API exposes verification and does not make heuristic anomaly signals automatic sanctions.
- CORS is restricted to the configured frontend origin. Compose development secrets are not suitable for deployment.
- PostgreSQL and MongoDB store application data; Redis is a best-effort dashboard cache and is not required for correctness.

For deployment, replace the local credentials, set a long random `JWT_SECRET`, use TLS, and keep database, MongoDB, and Redis ports private.
