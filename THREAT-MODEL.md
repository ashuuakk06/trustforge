# What can go wrong in the local demo

This page records the limits I considered while building the demo. It is not a production security review.

| Situation                              | What the app does                                                   | Limit to keep in mind                                                       |
| -------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Someone guesses or shares a demo login | Passwords are checked with BCrypt and the API checks account roles. | All sample users share the public password `trustforge`.                    |
| A judge scores an unassigned project   | The API checks that the judge has an assignment first.              | Organizer accounts can change event data.                                   |
| A user votes more than once            | PostgreSQL has a unique constraint for the voter account.           | This does not stop someone from creating multiple accounts.                 |
| A score looks unusual                  | The app adds a review flag and shows the score context.             | The flag can be wrong and must not be treated as a finding.                 |
| An audit payload changes               | The audit page recalculates the stored hash links.                  | Someone with database access could rewrite the records and hashes together. |
| Someone opens a project in the gallery | Gallery projects are meant to be public in this demo.               | Do not submit private work or personal information.                         |

The local Compose secrets are examples. Anyone who runs this outside a private computer should replace them and restrict network access to PostgreSQL.
