# The Lantern Trails world

This folder holds the world of the course: the company data, Draft Planner and the viewer. Everything here is made up. A program, `generate.ts`, builds it the same way every time. No AI model wrote any of the answers.

If a file gets changed or lost, this command builds the world again:

```bash
bun run world reset
```

Expect: `Reset the world from its seed and cleared world/logs.`

## What is in this folder

| File                                  | What is in it                                                                                                              |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `viewer.html`                         | The viewer. Open it with a double-click. It reads `data/viewer-data.js`                                                    |
| `data/catalogue.csv`                  | 220 places the company can book: walks, museums, tastings, boats, restaurants, hotels. Closed days, season, access, food, price |
| `data/travel-times.csv`               | Minutes by car and by train between 14 areas                                                                               |
| `data/requests.csv`                   | 300 customer requests                                                                                                      |
| `data/traces.jsonl`                   | 300 Draft Planner runs: the request, what it looked up, the draft, and what the designer did                              |
| `data/planted.csv`                    | The answer key: which trace has which mistake, and why                                                                     |
| `data/sample-30.csv`                  | The 30 drafts you read first. 13 of them have a planted mistake                                                            |
| `data/expert-labels.csv`              | Ines Duarte's pass or fail for 120 drafts, on mobility, with a reason                                                      |
| `data/golden-set.csv`, `data/splits/` | 40 drafts for you to label. The splits: 20 drafts to learn from (train), 50 to try on (dev), 50 for the final test (test)  |
| `data/judges/`                        | Three AI graders, recorded on the same 120 drafts                                                                          |
| `data/releases/`                      | The live model and the cheaper model, each run on 150 new requests                                                         |
| `data/ab-test.csv`                    | 2,400 sessions from a test of instant drafts                                                                               |
| `logs/runs.jsonl`                     | A record of every Draft Planner run. Git does not track it                                                                 |

## The planted mistakes

A **failure mode** is one kind of mistake, with a name. The world has eight planted failure modes:

- closed on the day;
- impossible transfer (two stops too far apart);
- ignores mobility (steps for someone who cannot climb them);
- not in the catalogue;
- over budget;
- wrong pace;
- diet missed;
- out of season.

For example, look at row T122 in `data/planted.csv`:

```text
T122,sample,closed-on-the-day,"Pinhao Cork Workshop Museum is booked on a Monday, but it is closed on Mondays."
```

The file `rules.ts` holds the company's trip rules as code. The generator uses these rules to prove that each planted trace has one mistake only: the planted one.
