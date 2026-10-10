# Judging methodology

## Assignment

Assignments are deterministic for the seeded event (`algorithmVersion=v1.2`, seed `8f91c7`). The engine filters ineligible/conflicting pairs, respects capacity and minimum coverage, and records an explanation containing eligibility, conflict, workload, coverage, penalties, and fairness score. Metrics include coverage rate, conflict rate, workload variance, utilization, and min/max coverage.

## Rubric

The demo rubric is version `RUBRIC:v3`: Innovation 20%, Technical Quality 25%, Impact 20%, UX 15%, Feasibility 20%. Each criterion is scored from 0 to 10. The backend validates bounds and stores evaluations against a submission version.

## Normalization

`z = (x - μ_j) / σ_j`, where `μ_j` is a judge mean and `σ_j` is sample standard deviation. A zero standard deviation uses a stable unit denominator; sample size, method, algorithm version, and timestamp remain visible. Missing evaluations are not silently imputed. Project signal is the mean of its available judge z-scores.

## Anomalies and results

The demo surfaces potential project-specific deviation above 1.55 standard deviations. Evidence includes observed deviation, baseline, confidence, judge, project, and review status. It never decides fraud or automatically disqualifies anyone. Results combine normalized judging signal, eligible community signal, eligibility, and tie-break rules into a versioned snapshot.

The API includes a Bradley–Terry-labelled pairwise read model. A production implementation should persist comparison outcomes, fit a convergent solver, expose uncertainty, and snapshot the fitting dataset.
