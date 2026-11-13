# Assignment: label the Lantern Trails drafts in a Langfuse queue

This task is optional in the live session. It is expected as homework. You need no code.

## The task

Label the 40 course drafts in a Langfuse annotation queue. Then export the result.

1. Open the queue link in `queue-link.md`. The 40 drafts are loaded.
2. Label every draft pass or fail for `mobility-verdict`. Add a comment on every fail.
3. Run `bun run export-scores`. It writes `scores-export.csv` here.
4. Run `bun run assignment`. It checks every Done-when line and writes `result.json`.

```bash
bun run export-scores
```

Expect: `Wrote assignment/scores-export.csv: 40 rows.`

```bash
bun run assignment
```

Expect: two `PASS` lines and `Wrote assignment/result.json.`

## Done when

The script checks both lines.

- Every row has one label.
- The export file is in `assignment/`.

## Rubric

A person reads this. There are no points.

1. The pass rate in `result.json` matches your spreadsheet from part 2, or each changed label has a one-line reason.
2. Every fail has a comment that names the stop and what is wrong.
3. `langfuseVersion` in `result.json` is filled in.

## Hand in

Push a branch named `assignment` and send its URL. The grader runs `bun run assignment` again.

## Files here

| File                 | What it is                                                      |
| -------------------- | --------------------------------------------------------------- |
| `queue-link.md`      | The starter: a link to the queue with the rows loaded.          |
| `import-rows.ts`     | Loads the 40 drafts into a queue. The course team runs it.      |
| `export-scores.ts`   | Writes your labels to `scores-export.csv`.                      |
| `check.ts`           | Tests the Done-when lines and writes `result.json`.             |
| `docker-compose.yml` | Optional. Hosts Langfuse on your laptop, about 2 GiB of memory. |
