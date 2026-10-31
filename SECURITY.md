# Security notes

TrustForge is set up for a local student demo. Do not put real participant data in it or expose its default setup to the internet.

- Passwords are saved as BCrypt hashes.
- Signed-in requests use JWT access tokens. Refresh tokens are stored as hashes and rotated when used.
- Reusing an old refresh token revokes the rest of that login session.
- Spring Security checks organizer/admin roles, and judges can only score projects assigned to them.
- PostgreSQL enforces one vote per account.
- Audit events link to the previous event and include a hash of the event payload. The verify page checks those links.
- The certificate page only checks whether an ID exists in the demo database. It does not verify an external digital signature.
- Score review flags are prompts for a person to inspect; they do not automatically affect a judge or project.

Before running outside your computer, replace the demo passwords and JWT secret, restrict database ports, and use HTTPS. The sample accounts and local Compose values are public in this project.
