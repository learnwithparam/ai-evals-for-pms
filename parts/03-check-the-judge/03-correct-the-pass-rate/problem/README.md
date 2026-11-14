# Correct the pass rate

This is an extension step. You can skip it.

## The problem

The mobility judge passed 250 of 300 drafts. The dashboard says 83% pass. But the judge makes mistakes, so 83% is not the true rate. You can fix it with the two rates from `test-the-judge`, using the Rogan-Gladen correction.

## Watch it done

Before: `corrected.md` has no corrected rate yet, so the check does not pass.
After: the check says Done. All 4 rules pass.

## Your turn

1. Open `corrected.md` in this folder.
2. Write the raw rate: 250 divided by 300. For example, `Raw pass rate: 0.833`.
3. Copy the mobility judge's `TPR:` and `TNR:` from your `judge-check.md`.
4. In a spreadsheet cell, work out the corrected rate:
   - corrected = (raw + TNR - 1) / (TPR + TNR - 1)
5. Write it on the line that starts with Corrected pass rate. Keep three decimal places while you work. Round only at the end.
6. On the `Why:` line, say in one sentence why the raw rate is wrong.
7. Run the check.

```bash
bun run verify correct-the-pass-rate
```

Expect: `Done. All 4 rules pass.` and a `Progress:` line.

## Do it on your work

Take a rate from a dashboard where a judge does the grading. Use the judge's TPR and TNR to correct it. Good looks like: your Why line names the mistake the judge makes, in one full sentence.

## Done when

- corrected.md states the Raw pass rate: of the judge, 250 of 300.
- The TPR: and TNR: lines hold the mobility judge's rates from test-the-judge.
- The Corrected pass rate: is within 0.01 of the Rogan-Gladen value.
- A Why: line says in 8 or more words why the raw rate is wrong.

## Solution

The `solution` folder holds a finished `corrected.md` with the raw rate, both rates and the corrected rate.

## If you get stuck

Find your `FAIL` line on the left. Do the fix on the right.

| What you see                        | Fix                                                         |
| ----------------------------------- | ----------------------------------------------------------- |
| `FAIL the TPR: and TNR: lines hold` | Use the mobility judge, not the generic one.                |
| `FAIL the Corrected pass rate: is`  | Check the brackets. Both the top and the bottom subtract 1. |
| `FAIL a Why: line says`             | Say what the judge gets wrong, in a full sentence.          |

## Words you will use

- **Raw pass rate**: the share of drafts the judge passed, before any fix.
- **Corrected pass rate**: the share that would pass if the judge made no mistakes.
- **Rogan-Gladen correction**: the formula that turns the raw rate into the corrected rate, using TPR and TNR.

## How the correction works

This is how the correction works:

```mermaid
flowchart LR
  R["Raw: the judge passed 250 of 300"] --> F["(raw + TNR - 1) / (TPR + TNR - 1)"]
  J["TPR and TNR from test-the-judge"] --> F
  F --> C["Corrected pass rate"]
```
