# Eval plan: shop returns assistant

## Outcome

A customer gets the real returns rules, so they can send an item back without writing to the shop.

## Failure modes

- Wrong refund window: at most 1 fail in 100 answers. Critical.
- Wrong postage rule: at most 3 fails in 100 answers.
- Worn item accepted: at most 3 fails in 100 answers.
- Answers a different question: at most 5 fails in 100 answers.

## Thresholds

A release ships only if every row holds. Wrong refund window is critical and blocks a launch on its own.

## Grader

Checked by: code. The refund window is a number, so a plain rule can compare it with the policy page. I test the rule on my own labels first.

## Repeat runs

Runs: 4
Spread: the pass count moved by 3 answers across the four runs, so a gain under 3 is noise.

## Business case

A wrong refund window costs the shop about 40 euros for each refund it must honour. It also costs support time. That is more than one check costs.

## Evidence

Traces: R02, R05, R04, R14, R07
