# Threat model

| Threat | Impact | Mitigation | Residual risk |
|---|---|---|---|
| Account takeover / token theft | unauthorized actions | BCrypt, expiring access JWTs, rotated/revocable refresh tokens, TLS guidance | stolen active token until expiry |
| Sybil / ballot stuffing | distorted community signal | one vote per account, velocity/duplicate flags, audit events | coordinated legitimate accounts |
| Judge collusion or bias | unfair ranking | conflict-aware assignment, normalization, anomaly evidence, human review | review quality remains human |
| Submission scraping | privacy and IP exposure | role-scoped drafts and a public gallery boundary | public projects are intentionally public |
| Deadline manipulation | invalid late submissions | server-side dates and explicitly audited overrides | privileged organizer misuse is visible |
| Privilege escalation / IDOR | private data exposure | JWT roles plus ownership/assignment checks | future endpoints must follow policy |
| Invitation abuse | unauthorized event access | expiring, hashed invitation tokens in the persistence design | email delivery is outside local demo |
| Webhook abuse | replay or exfiltration | signed deliveries, retry/backoff, delivery logs | consumer endpoint security |
| Audit tampering | loss of trust | canonical payload hashing and full-chain verification | compromised storage host |
| Result manipulation | wrong public outcome | immutable input snapshot and publish event | new versions are visible and auditable |

Production deployment should use injected secrets, TLS, persistent Redis, PostgreSQL backups, restrictive CORS, and key rotation.
