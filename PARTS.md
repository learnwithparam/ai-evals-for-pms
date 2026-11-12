# Parts and steps

The plan for every part. A part session starts from this file and the part's README. Minutes add up to 325.

| Part folder | Status | Steps (minutes) | Part minutes |
|---|---|---|---|
| `00-orientation` | Built | meet-lantern-trails (15) | 15 |
| `parts/01-look-before-you-measure` | Built | read-the-traces (25), name-the-failure-modes (20), count-the-failures (10) | 55 |
| `parts/02-define-good` | Skeleton | write-the-rubric (20), label-the-golden-set (20), compare-with-the-expert (10) | 50 |
| `parts/03-check-the-judge` | Skeleton | test-the-judge (25), choose-the-judge-prompt (20), correct-the-pass-rate (15, extension), write-your-own-judge (20, extension) | 80 |
| `parts/04-decide-and-write-it-down` | Skeleton | set-launch-criteria (20), compare-the-releases (15), read-the-ab-test (25), write-the-eval-section (25), plan-the-weekly-review (20, extension), bring-your-own-traces (20, extension) | 125 |

## What each check reads

Every check reads only the files in the step's own folder, the world data in `world/data/`, and the answer key `world/data/planted.csv`. No check calls a model. The learner works in a spreadsheet and the viewer, and hands in CSV or Markdown.

| Step | Learner hands in | The check reads and compares |
|---|---|---|
| meet-lantern-trails | `question.md` | World counts (300 traces, 220 items). Three Draft Planner runs in replay, read back from `world/logs/runs.jsonl`. A `Question:` line asking how often, a `Who decides:` line naming Ines Duarte |
| read-the-traces | `notes.csv` | The 30 ids in `world/data/sample-30.csv`. Each note is `ok` or 6+ words. At least 3 in 4 of the sample's planted faults have a note that is not ok. At least 5 notes are ok |
| name-the-failure-modes | `failure-modes.md` (+ `notes.csv`) | 4 to 8 `##` modes, each with a 6+ word `Definition:` and 2+ ids on `Traces:` that have non-ok notes. No vague-only names. Modes cover 80% of non-ok notes |
| count-the-failures | `notes.csv` with `mode`, `counts.csv`, `top-mode.md` | Every non-ok note has a mode or `none`. Modes match headings. Counts equal the tags. Sorted biggest first. `top-mode.md` names the first row and its count |
| write-the-rubric | `rubric.md` | Headings Pass, Fail, Borderline rule, Examples. 2+ pass and 2+ fail ids that exist. No scale words. A line on what it does not cover |
| label-the-golden-set | `labels.csv` | 40 ids from `golden-set.csv`, labels pass or fail, both present, each fail with a 6+ word reason |
| compare-with-the-expert | `compare.md` (+ `labels.csv`) | Agreement and kappa within 0.01 of the true values against `expert-labels.csv`. Each disagreement has one resolution |
| test-the-judge | `judge-check.md` | TPR and TNR for the two pass or fail judges within 0.01 (mobility 0.93 and 0.87, generic 0.97 and 0.37). Picks the mobility judge. A line on the 1 to 5 judge |
| choose-the-judge-prompt | `judge-prompt.md` (+ `rubric.md`) | Rubric Pass and Fail text present. 2 to 4 example ids, all in `splits/train.csv`. A reason before the verdict. One mode |
| correct-the-pass-rate | `corrected.md` | Rogan-Gladen corrected rate within 0.01, given the raw rate the step states |
| write-your-own-judge | `my-judge-verdicts.csv` | 40 rows from `splits/dev.csv`, columns trace_id, critique, verdict. TPR and TNR against Ines both 0.80 or more |
| set-launch-criteria | `launch-criteria.md` (+ `failure-modes.md`) | A row per mode with a number threshold, set size 30+, a critical flag and an owner. At least one critical |
| compare-the-releases | `release-decision.md` (+ `launch-criteria.md`) | A verdict word. 3+ numbers found in `releases/`. The verdict equals the learner's criteria applied to `releases/summary.csv` |
| read-the-ab-test | `ab-decision.md` | Rates per arm and the difference with its 95% interval within 0.5 points. Crossing zero stated. Refund guardrail stated. Decision consistent |
| write-the-eval-section | `prd-eval-section.md` | Seven headings in order. Mode names and thresholds match earlier files |
| plan-the-weekly-review | `review-plan.md` | Count read each cycle, the mix, the reader, minutes, an alert rule with a number, the action on alert |
| bring-your-own-traces | `own/notes.csv`, `own/failure-modes.md` | The read-the-traces and name-the-failure-modes rules, on 20 of the learner's own ids |

## Notes for part sessions

- Build each step like part one: `step.toml`, `problem/` (README with the five sections, plus the starter, which may carry the previous step's sample answer), `solution/`, at least one `wrong/<mistake>/`, and `checks/<step-name>.ts` using `checks/lib/`.
- Readers in `checks/lib/files.ts` forgive spreadsheet habits (byte-order marks, quoted cells, capital headers). Use them.
- The world is fixed by seed. Do not edit `world/data/` by hand; change `world/generate.ts` and run `bun run world reset`, then `bun test`.
- Keep every page at a grade 6 reading level. No weekday or date names in any page.
- Remove `TODO(part session)` from the part README when its steps exist, so `bun run check` holds the part to the full standard.
