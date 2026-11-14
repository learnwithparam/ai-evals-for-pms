# Ship your own eval

## The problem

You have run the whole path on Lantern Trails. Now do it on your own feature. A plan on paper is not enough. It must point at real traces you read, and its numbers must come from your own notes. This step has no course data. It reads only your files.

## Your challenge

This folder has an `own/` folder with the sample files from the last step, and a blank `own/eval-plan.md`. Copy your own `notes.csv`, `failure-modes.md` and `rubric.md` over the samples. Then fill in the plan.

1. Under `## Outcome`, write one sentence: what can your user do when the feature gets it right?
2. Under `## Failure modes`, write one line per mode from your `failure-modes.md`. Give each a limit, like `Wrong spray dose: at most 1 fail in 100 answers`. Mark the one that must never ship broken as `Critical`.
3. Under `## Thresholds`, say in a sentence how a release passes or is blocked.
4. Under `## Grader`, write `Checked by:` with the same choice as your rubric, code or judge, and say why.
5. Under `## Repeat runs`, run the feature three or more times. Write `Runs:` and a `Spread:` sentence that says how far the pass count moved.
6. Under `## Business case`, say who pays when it fails, with one real number.
7. Under `## Evidence`, write `Traces:` and list at least 3 ids from your `notes.csv` that are not `ok`.

For example, a farm advice plan says: `Wrong spray dose: at most 1 fail in 100 answers. Critical.` Its evidence lists F02, F05 and F14, three real answers with a wrong dose.

```mermaid
flowchart LR
  N[own/notes.csv] --> M[own/failure-modes.md]
  M --> R[own/rubric.md]
  R --> P[own/eval-plan.md]
  N -.->|evidence ids| P
```

## Done when

- `own/eval-plan.md` has the seven headings, in order.
- Outcome says what a good result is for your user.
- Every mode in your `failure-modes.md` has a number limit, and one is Critical.
- Grader says code or judge, the same as your rubric.
- Repeat runs has `Runs:` of 3 or more and a `Spread:` line with a number.
- Business case has a number.
- Evidence lists at least 3 of your own flagged ids.

```bash
bun run verify ship-your-own-eval
```

Expect: `Done. All 8 rules pass.` and a `Progress:` line.

## If you get stuck

| What you see                          | Fix                                                            |
| ------------------------------------- | -------------------------------------------------------------- |
| `FAIL Failure modes gives every mode` | Spell each mode as in `own/failure-modes.md` and add a number. |
| `FAIL Grader says code or judge`      | Make the Grader line and the rubric Checked by line agree.     |
| `FAIL Evidence lists at least 3 ids`  | Use ids from `own/notes.csv` whose note is not `ok`.           |

## Words you will use

- **Eval plan**: one page that says what you measure, the limits, how it is graded and why it is worth it.
- **Spread**: how far a count moves when you run the same thing again.
- **Evidence**: the real traces behind the plan.
