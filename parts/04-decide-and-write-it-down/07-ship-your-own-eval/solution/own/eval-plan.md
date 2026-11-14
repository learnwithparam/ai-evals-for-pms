# Eval plan: farm advice assistant

## Outcome

A farmer gets advice that matches the expert fact sheet, so the farmer can act on it without calling the office.

## Failure modes

- Wrong spray dose: at most 1 fail in 100 answers. Critical.
- Wrong planting season: at most 3 fails in 100 answers.
- Product not on the fact sheet: at most 2 fails in 100 answers.
- Answers a different question: at most 5 fails in 100 answers.

## Thresholds

A release ships only if every row holds. Wrong spray dose is critical and blocks a launch on its own.

## Grader

Checked by: judge. A person must read the answer beside the fact sheet. So a judge model grades the dose. I check it against my own labels first.

## Repeat runs

Runs: 5
Spread: the pass count moved by 4 answers across the five runs, so a gain under 4 is noise.

## Business case

A wrong spray dose can ruin a crop. It costs the farmer about 200 euros of seed and lost yield. That is far more than one check costs.

## Evidence

Traces: F02, F05, F14, F04, F10
