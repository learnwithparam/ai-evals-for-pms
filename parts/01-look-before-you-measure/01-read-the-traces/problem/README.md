# Read the traces

## The problem

You have 30 drafts to read. Some are fine. Some have a problem a designer had to fix. You do not know yet what kinds of problems there are. If you start with a list of problems, you will only find the ones on your list. So you read first and write what you see.

![The viewer with a draft open and the note box below it](../images/expected.png)

## Your challenge

1. Open `world/viewer.html` and click **Read the drafts**. The list on the left shows your 30 drafts.
2. For each draft, compare the draft with the request at the top. Look at the budget, the days places are closed, the walking, the food, and the travel time between stops.
3. Write one note in the box:
   - If something is wrong, say what you see in at least 6 words. Describe it. Do not guess why it happened.
   - If the draft is fine, write `ok`.
4. Click **Download notes.csv**. Move the file into this `problem` folder, in place of the starter.

A good note: "Books a steep walk for a traveller in a wheelchair." A weak note: "bad", or "the model was confused".

## Done when

- `notes.csv` is in this folder.
- It has the columns `trace_id` and `note`.
- It has the 30 drafts from your sample, each one once.
- Every note is the word `ok`, or at least 6 words that say what you saw.
- You spotted most of the drafts with a real problem.
- You did not flag every draft: at least 5 notes say `ok`.

```bash
bun run verify read-the-traces
```

Expect: `Done. All 6 rules pass.` and a `Progress:` line.

## If you get stuck

| What you see                                              | Fix                                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `FAIL notes.csv is in this folder`                        | Your download went to your Downloads folder. Move it here.                    |
| `FAIL it has the 30 drafts from your sample`              | Do not add or remove rows. Start from the starter `notes.csv` if you need to. |
| `FAIL every note is filled in`                            | Find the empty or short notes. Write what you saw, or `ok`.                   |
| `FAIL you spotted most of the drafts with a real problem` | Open the drafts you marked `ok` and check each fact against the request.      |
| `FAIL you did not flag every draft`                       | A note is for something a designer would fix. If a draft is fine, write `ok`. |

You can also fill in `notes.csv` in a spreadsheet. Save it as CSV, not as a spreadsheet file.

## Words you will use

- **Trace**: the record of one Draft Planner run: the request, what it looked up, and the draft.
- **Sample**: a smaller set you read in full instead of the whole pile. Here, 30 of 300.
- **Open note**: a few words in your own language about what went wrong. No fixed list.
- **Describe, not diagnose**: write what you see ("closed that day"), not your guess at the cause ("bad prompt").
