# Draft Planner: how we measure it

## User outcome

A designer can send a draft to the customer with light edits or none. Every stop is real, open, in season and in budget, and it suits the traveller.

Business case: a bad mobility draft means a refund and a lost customer. One refund costs far more than the 0.042 euros it costs to make a draft.

## Failure modes

We read 30 drafts and found five failure modes:

- Ignores mobility needs: a stop the traveller cannot use, like steep steps for a wheelchair.
- Closed on the day: a place booked on its closed day.
- Over budget: the total is more than the budget on the request.
- Impossible travel: two stops too far apart for the time between them.
- Wrong food for the diet: a meal that does not fit the diet asked for.

## Metrics and thresholds

Each number is the most drafts that may fail, out of the 150-draft release set.

- Ignores mobility needs: at most 1. Critical.
- Wrong food for the diet: at most 1. Critical.
- Closed on the day: at most 6.
- Over budget: at most 5.
- Impossible travel: at most 4.

## Golden set

Size: 40
Owner: Ines Duarte
Refresh when: a new failure mode shows up in a review, or the catalogue changes a lot.

## Judges

The mobility judge grades the mobility mode. It agrees with Ines well enough to use.

TPR: 0.97
TNR: 0.37

## Launch rule

A release ships only if it meets every threshold. Ignores mobility needs and Wrong food for the diet are critical. Each one blocks a launch on its own, even when the average gets better.

## After launch

Ines reads a mix of drafts each review cycle: some at random, and some flagged by a refund or a rewrite. If mobility fails on more than 1 draft in a cycle, we stop instant drafts and look.
