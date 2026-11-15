# RAS readiness model (v1)

Implemented in `src/lib/analytics/readiness.ts` (pure functions, unit-tested)
and configured by `READINESS_CONFIG`.

> This is a transparent planning heuristic built on the user's own mock tests.
> It is **not** a scientifically validated probability of selection and the UI
> never presents it as one.

## What is compared

* Only the signed-in user's mocks (RLS).
* Prelims and Mains are analysed separately.
* Only mocks with the same `exam_pattern_version` are compared.
* Benchmarks come from `historical_cutoffs` for the user's **own category**,
  the same stage and the same pattern. Each cutoff stores its exam total, so a
  mock out of 100 and a cutoff out of 200 are compared as percentages.
* If no official cutoff exists, an optional personal target (%) from Settings
  is used and clearly labelled as personal.

## Score

A score appears only after **5 comparable mocks** (`minMocks`) and a benchmark.
Each component is normalised to 0–100:

| Component | Weight | Definition |
|---|---|---|
| Recent performance | 45 % | Recency-weighted mean (5,4,3,2,1) of the last 5 mock percentages, mapped against the benchmark: ratio ≤ 0.6 → 0, 1.0 → 75, ≥ 1.15 → 100 (linear between) |
| Consistency | 25 % | `100 − 5 × std-dev` of the last 5 mock percentages |
| Coverage & balance | 20 % | ½ syllabus completion + ½ subject balance (`100 × (1 − CV)` across subject percentages); syllabus only if no subject data |
| Accuracy | 10 % | correct ÷ attempted across recent mocks (needs counts) |

Missing components (e.g. accuracy for Mains) have their weight redistributed
proportionally. Bands: **< 40** Below target · **40–59** Approaching target ·
**60–79** Competitive · **≥ 80** Strong preparation.

## Other analytics

* **Score range** — mean ± 1 std-dev of the last 5 comparable mocks, scaled to
  the benchmark exam's total. Labelled as a mock-performance estimate.
* **Rank estimation** — intentionally not shown: it requires real candidate
  distribution data.
* **What-if calculator** — adds marks to a subject (capped by the marks still
  available in that subject) on the latest mock and shows the projected score
  and cutoff buffer. Labelled hypothetical.
* **Summary** — average, best, latest, accuracy, improvement (mean of the last
  ≤3 mocks minus the ≤3 before), trend line, last five, strong/weak subjects.

## Mock scoring

`Score = (Correct × marks per correct) − (Incorrect × negative marks)`.
The marking scheme is stored on each mock — nothing is hardcoded — and the
form can calculate the score from the counts. Counts must add up to the total
number of questions (enforced in the form and by a database constraint).
