# Contributing

Use Java 21 and Maven for the Spring Boot API, and Node.js with npm for the React frontend. Keep assignment and normalization calculations deterministic, version reproducibility-sensitive rules, and write focused JUnit 5 tests for security and judging behavior. Update API and methodology docs when a workflow changes.

Do not commit secrets or rely on frontend-only authorization. PostgreSQL is the source of truth for workflow data; MongoDB stores submission event timelines; Redis remains an optional cache.
