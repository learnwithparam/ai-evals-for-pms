# The Lantern Trails world

Everything here is made up and built from a fixed seed by `generate.ts`. No label comes from a model.

```bash
bun run world reset
```

Expect: `Reset the world from its seed and cleared world/logs.`

| File                                  | What is in it                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `viewer.html`                         | The viewer. Open it with a double-click. It reads `data/viewer-data.js`                                            |
| `data/catalogue.csv`                  | 220 places to book: walks, museums, tastings, boats, restaurants, hotels. Closed days, season, access, food, price |
| `data/travel-times.csv`               | Minutes by car and train between 14 areas                                                                          |
| `data/requests.csv`                   | 300 customer requests                                                                                              |
| `data/traces.jsonl`                   | 300 Draft Planner runs: the request, the lookups, the draft, what the designer did                                 |
| `data/planted.csv`                    | The answer key: which trace carries which failure mode, and why                                                    |
| `data/sample-30.csv`                  | The 30 drafts the learner reads first. 13 carry a planted fault                                                    |
| `data/expert-labels.csv`              | Ines Duarte's pass or fail on mobility for 120 drafts, with a reason                                               |
| `data/golden-set.csv`, `data/splits/` | 40 drafts to label; train 20, dev 50, test 50                                                                      |
| `data/judges/`                        | Three recorded judges on the same 120 drafts                                                                       |
| `data/releases/`                      | The live and cheaper-model releases on 150 held-out requests                                                       |
| `data/ab-test.csv`                    | 2,400 instant-draft test sessions                                                                                  |
| `logs/runs.jsonl`                     | Every Draft Planner run. Git ignores it                                                                            |

The eight planted failure modes: closed on the day, impossible transfer, ignores mobility, not in the catalogue, over budget, wrong pace, diet missed, out of season. `rules.ts` holds the house rules as code, and the generator proves each planted fault is the only fault in its trace.
