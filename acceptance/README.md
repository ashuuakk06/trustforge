# Acceptance suite

Run `./smoke.ps1 -BaseUrl http://localhost:8080` after starting the backend. The smoke suite checks the seeded gallery, login, dashboard data, assignment coverage, normalization output, audit chain, results, certificate verification, and backend judge role isolation. It reports `VERIFIED` only after the assertion executes successfully.

The repository also contains focused Java tests in `backend/src/test/java/com/trustforge/TrustForgeStoreTest.java` for normalization determinism, audit tamper detection, assignment conflict/capacity behavior, and duplicate voting.
