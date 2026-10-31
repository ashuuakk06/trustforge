# Data in the demo

The main event records are stored in PostgreSQL. The Flyway SQL files are the source of truth for the tables.

| Table                  | What it stores                                             |
| ---------------------- | ---------------------------------------------------------- |
| `users`                | Login email, name, role, and password hash.                |
| `refresh_tokens`       | Hashed refresh tokens and their expiry/revocation state.   |
| `events`               | Event name, state, start time, and deadlines.              |
| `projects`             | Project details, owner, status, version, and content hash. |
| `submission_processing_events` | Ordered status history for each submitted project.      |
| `judges`               | Judge account and review capacity.                         |
| `judge_conflicts`      | Judge/project conflicts declared for the event.            |
| `assignments`          | Which judge reviews which project and why.                 |
| `evaluations`          | Rubric scores and comments for a project.                  |
| `normalization_runs`   | Inputs and output from a score comparison run.             |
| `anomalies`            | Score patterns waiting for a person to review.             |
| `votes` and `comments` | Participant activity on projects.                          |
| `notifications`        | Messages shown in the user's workspace.                    |
| `audit_events`         | Event actions, their payloads, and linked hashes.          |
| `result_snapshots`     | The calculated ranking and its input hash.                 |
| `certificates`         | Certificate details used by the local ID lookup.           |

Submission processing steps are stored in PostgreSQL in `submission_processing_events`. The API returns events after a requested sequence number, which lets the frontend poll without reloading the full project history. Dashboard values are read directly from PostgreSQL.

This is the schema used by the demo, not a full event-management schema. For example, participants are represented by user accounts and their project submissions rather than separate team tables.
