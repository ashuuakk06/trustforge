# Security notes

Passwords are BCrypt-hashed. Access tokens are HMAC-SHA256 JWTs with expiry; refresh tokens are stored server-side by token ID, consumed once, and rotated. The demo browser holds access tokens in local storage for portability; production should prefer an httpOnly secure same-site refresh cookie and a short-lived in-memory access token.

Spring Security protects non-public routes. Organizer/admin operations are checked in the controller, and judge evaluations are filtered to assignments. Validation, CORS, request IDs, safe error text, Actuator health, and audit events are enabled. Never use the development secret outside a local demo.
