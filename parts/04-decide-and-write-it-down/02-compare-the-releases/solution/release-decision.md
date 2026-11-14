# Release decision: the cheaper model

Verdict: block

## The numbers

- The cheaper model passes 132 of 150 drafts (88%). The live model passes 129 (86%).
- It costs 0.014 euros a draft, against 0.042 for the live model.
- It fails Ignores mobility needs on 7 drafts. Our threshold is at most 1. The live model fails 1.
- 26 of the 150 requests need step-free places, so 7 of those 26 travellers would get a stop they cannot use.

## Why

Ignores mobility needs is a critical mode, and the cheaper model breaks its threshold. A critical row blocks the launch on its own, even when the average is better. We can run the cheaper model again once engineering fixes the mobility failures.

## Repeat runs

Runs: 5 runs of each release, in world/data/releases/repeat-runs.csv.
Spread: live 4 drafts (127 to 131), cheaper model 8 drafts (125 to 133).
The cheaper model gained 3 drafts in the first run, which is less than its own spread of 8, so the average gain may be luck. The mobility block does not depend on it.
