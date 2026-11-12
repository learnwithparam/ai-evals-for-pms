# Count the failures

## The problem

You know what goes wrong. You do not know how often. The boss asked "how often?", so you need a number for each failure mode. The counts also show which problem to fix first.

![The bar chart the viewer draws from counts.csv](../images/expected.png)

## Your challenge

This folder already has a filled-in `notes.csv` and `failure-modes.md`. If you want to use your own work, copy your files into this folder in their place.

1. Open `notes.csv` in a spreadsheet. Add a third column called `mode`.
2. For each note that is not `ok`, type the name of its failure mode. Spell it the same as in `failure-modes.md`. If a note is not a real problem, type `none`. Leave the `ok` rows empty.
3. Make a pivot table. A pivot table counts rows for you. Put `mode` in the rows. Use the count of `trace_id` as the values. Leave out `none` and empty rows.
4. Sort the table from the biggest count to the smallest. Save it as `counts.csv`, with two columns: `mode` and `count`.
5. In `top-mode.md`, write one sentence. Name the top mode and its count.
6. Open the **Chart your counts** tab in the viewer and choose your `counts.csv`. Compare your chart with the picture above.

Save every file as CSV or plain text, in this folder.

For example, the sample answer finds five modes. Its `counts.csv` looks like this:

```text
mode,count
Ignores mobility needs,4
Closed on the day,3
Over budget,2
Impossible travel,2
Wrong food for the diet,2
```

So its `top-mode.md` says: "The top failure mode is Ignores mobility needs, with 4 drafts out of 30."

Your numbers can be different. They come from your own notes.

## Done when

- `notes.csv` in this folder has a `mode` column.
- Every note that is not `ok` has a mode, or the word `none` if it is not a failure.
- Every mode you used is a heading in `failure-modes.md`.
- `counts.csv` has a `mode` column and a `count` column, one row for each mode you used.
- Each count matches the number of notes with that mode.
- `counts.csv` runs from the biggest count to the smallest.
- `top-mode.md` names the mode at the top of `counts.csv` and its count.

Run the check:

```bash
bun run verify count-the-failures
```

Expect: `Done. All 7 rules pass.` and a `Progress:` line.

## If you get stuck

Find the `FAIL` line you see in the left column. Then do the fix on the right.

| What you see                                  | Fix                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------- |
| `FAIL every mode you used is a heading`       | A small spelling change makes a new mode. Copy the names from `failure-modes.md`. |
| `FAIL each count matches`                     | Make the pivot table again from `notes.csv`. Do not count by hand.               |
| `FAIL counts.csv runs from the biggest count` | Sort by `count`, with the biggest first.                                         |
| `FAIL top-mode.md names the mode at the top`  | Use the first row of `counts.csv`, and write its number.                         |

## Words you will use

- **Pivot table**: a spreadsheet tool that counts rows by the values in one column. Google Sheets, Excel and LibreOffice all have one.
- **Count**: how many drafts in your sample show one failure mode.
- **Top mode**: the failure mode with the biggest count. It is often the first thing to fix.
