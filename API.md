# API routes

Base path: `/api/v1`. Routes that need a signed-in user accept `Authorization: Bearer <accessToken>`.

## Login

| Method | Route            | Purpose                                     |
| ------ | ---------------- | ------------------------------------------- |
| POST   | `/auth/login`    | Sign in with an email and password.         |
| POST   | `/auth/register` | Create a participant account.               |
| POST   | `/auth/refresh`  | Exchange a refresh token for a new session. |
| POST   | `/auth/logout`   | Revoke a refresh token.                     |
| GET    | `/auth/me`       | Return the current user's profile.          |

## Event and submissions

| Method | Route                      | Purpose                                                   |
| ------ | -------------------------- | --------------------------------------------------------- |
| GET    | `/events`                  | Read the demo event.                                      |
| GET    | `/dashboard`               | Read event counts, judging progress, and recent activity. |
| GET    | `/submissions`             | List or search projects.                                  |
| POST   | `/submissions`             | Submit a project.                                         |
| GET    | `/submissions/{id}`        | Read one project.                                         |
| GET    | `/submissions/{id}/events?afterSequence=0` | Poll for submission events after the last received sequence. |
| GET    | `/gallery`                 | Read or search the public project gallery.                |

## Judging and review

| Method | Route                    | Purpose                                         |
| ------ | ------------------------ | ----------------------------------------------- |
| GET    | `/judges`                | List judges.                                    |
| GET    | `/assignments`           | Read judge assignments.                         |
| POST   | `/assignments/run`       | Create assignments for the event.               |
| GET    | `/evaluations`           | Read evaluations available to the current user. |
| POST   | `/evaluations`           | Save a judge's rubric scores.                   |
| GET    | `/normalization`         | Read normalized scores.                         |
| GET    | `/normalization/proof`   | Read the calculation inputs.                    |
| POST   | `/normalization/run`     | Calculate normalization again.                  |
| GET    | `/anomalies`             | List scoring flags for review.                  |
| POST   | `/anomalies/{id}/review` | Save a review note.                             |
| GET    | `/audit`                 | Read the audit events.                          |
| POST   | `/audit/verify`          | Check the audit hash chain.                     |
| GET    | `/pairwise`              | Compare projects by their current result rank.  |

Assignment, normalization, anomaly review, and audit actions are limited to organizers and admins. A judge can score a project only when assigned to it.

## Results and public pages

| Method | Route                         | Purpose                                              |
| ------ | ----------------------------- | ---------------------------------------------------- |
| GET    | `/results`                    | Read the current results.                            |
| POST   | `/results/publish`            | Save a result snapshot.                              |
| GET    | `/votes`                      | Read the vote totals.                                |
| POST   | `/votes`                      | Vote for a project.                                  |
| GET    | `/comments?projectId=...`     | List project comments.                               |
| POST   | `/comments`                   | Add a project comment.                               |
| GET    | `/notifications`              | Read the current user's notifications.               |
| GET    | `/certificates/verify?id=...` | Look up a certificate ID in the local demo registry. |
| POST   | `/certificates/verify`        | Look up a certificate ID from a request body.        |
| GET    | `/public/certificates/{id}`   | Read a public certificate record.                    |
| GET    | `/search?q=...`               | Search projects and judges.                          |

The certificate page checks whether the ID exists in the local database. It is a demo registry lookup, not a check against an external issuer.

The submission events route returns JSON with `status` and an `items` array. Pass `afterSequence` to retrieve only newer events; the browser polls while processing is in progress.

Health routes are `/health`, `/api/v1/health`, `/api/v1/health/demo`, and `/actuator/health`.
