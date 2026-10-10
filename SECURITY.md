# Security notes

Passwords are BCrypt-hashed. Access tokens are HMAC-SHA256 JWTs with short expiry; refresh tokens are stored server-side by SHA-256 token hash, consumed once, rotated within a family, and family-revoked when reuse is detected. The demo browser holds tokens in local storage for portability; production should prefer an httpOnly secure same-site refresh cookie and a short-lived in-memory access token.

Express middleware protects non-public routes. Organizer/admin operations use backend role guards, and judge evaluations are filtered to assignments. Zod validation, Helmet, CORS, request IDs, safe error text, authentication rate limits, health checks, and audit events are enabled. Never use the development secret outside a local demo.
