# How judging works

These calculations are written in Java in `TrustForgeAlgorithms.java` and `PlatformService.java`. They are ordinary rules and formulas; the app does not use an AI model.

## Judge assignments

For each project, the app removes judges who declared a conflict or reached their review capacity. From the remaining judges it picks the ones with the lightest current workload. A seeded hash breaks ties, so the sample event gets repeatable assignments. If there are not enough eligible judges, the API reports that project as short on coverage.

## Rubric

Each category is scored from 0 to 10.

| Category          | Weight |
| ----------------- | -----: |
| Innovation        |    20% |
| Technical quality |    25% |
| Impact            |    20% |
| UX                |    15% |
| Feasibility       |    20% |

## Normalization and review flags

The app calculates a mean and sample standard deviation for each judge. A score is compared with that judge's own scores:

```text
z = (score - judge's average) / judge's standard deviation
```

When a judge's scores have no spread, the demo uses `1` as the divisor so the calculation stays defined. A score farther than `1.55` standard deviations from that judge's average is shown for review. This is a simple signal, not proof of bias or misconduct.

## Result score

The published result combines the raw judging average (70%) with a community vote score (30%). The vote score is scaled against the most-voted project. The app saves the calculated entries and an input hash as a result snapshot.

The `/pairwise` route counts wins and losses from the current result order. It is only a different view of that ranking; it does not run a Bradley–Terry model.
