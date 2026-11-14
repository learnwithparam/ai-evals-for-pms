# Choose the judge prompt

## The problem

The mobility judge passed your test. Now write down its prompt. A prompt is the text you give an AI model. For example, T068 looks like a good example, but it is in `world/data/splits/test.csv`. If the judge sees it, the test score is no longer real. This is called leakage.

## Watch it done

Before: `judge-prompt.md` is not finished, so the check does not pass.
After: the check says Done. All 7 rules pass.

## Your turn

1. Open `judge-prompt.md` in this folder. This folder has a sample `rubric.md`. You can copy your own rubric over it.
2. The first line: tell the judge its one job. It checks mobility only, nothing else. Leave out every other failure mode. A judge that checks budget, diet and mobility at once mixes them up. One judge checks one mode.
3. Pass and Fail: paste the text from `rubric.md`, word for word. If the words change, the judge grades by a different rule than Ines.
4. Examples: 2 to 4 drafts from `world/data/splits/train.csv`. Include at least one Ines passed and one she failed. Write each one with her label and reason, like `- T056: fail. Foz Hilltop Lanes Walk has steep steps.`
5. Output: ask for the critique first, then the verdict, pass or fail. When the judge writes its reason first, its verdict follows from the reason.
6. Run the check.

```bash
bun run verify choose-the-judge-prompt
```

Expect: `Done. All 7 rules pass.` and a `Progress:` line.

## Do it on your work

Pick one judge you use or plan to use. Write its prompt in the same four parts: the one job, Pass and Fail, the examples, and the output. Good looks like: no example is a case you later score on.

## Done when

- judge-prompt.md and rubric.md are in this folder.
- The prompt holds the Pass and Fail text of rubric.md, word for word.
- The ## Examples section has 2 to 4 drafts.
- Every example comes from world/data/splits/train.csv.
- The examples show at least one pass and one fail from Ines.
- The ## Output section asks for the reason before the verdict.
- The prompt checks mobility only, and names no other failure mode.

## Solution

The `solution` folder holds a finished `judge-prompt.md`. Its examples come from train.

## If you get stuck

Find your `FAIL` line on the left. Do the fix on the right.

| What you see                                     | Fix                                                              |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| `FAIL the prompt holds the Pass and Fail text`   | Copy and paste from `rubric.md`. Do not retype it.               |
| `FAIL every example comes from`                  | Search for each id in `splits/train.csv`. Swap any id not there. |
| `FAIL the ## Output section asks for the reason` | Put the word critique before the word verdict.                   |
| `FAIL the prompt checks mobility only`           | Remove lines about budget, diet, pace, closed days or seasons.   |

## Words you will use

- **Train, dev and test**: three groups of labelled drafts. Train gives examples. Dev is for trying changes. Test gives the final score.
- **Critique**: the judge's short reason, written before its verdict.

## Why the examples come from train

```mermaid
flowchart LR
  A[120 drafts Ines labelled] --> T["train: 20 drafts. Use them as examples"]
  A --> D["dev: 50 drafts. Test the prompt while you change it"]
  A --> X["test: 50 drafts. Score the judge once, at the end"]
  T --> P[judge-prompt.md]
  P --> D
  P --> X
```
