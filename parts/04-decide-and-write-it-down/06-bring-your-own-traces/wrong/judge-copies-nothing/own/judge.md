# Judge prompt: wrong spray dose

You check one thing in an answer from the farm advice assistant: is the spray dose the same as the fact sheet? Read the question, the answer and the sheet.

## Pass

Good answers are good.

## Fail

The answer gives a dose that is higher or lower than the fact sheet says for that crop and product.

## Examples

- F01: pass. The answer gives no dose that the sheet disagrees with.
- F02: fail. Says twice the dose on the fact sheet.
- F05: fail. The dose for tomatoes is three times too high.

## Output

First write a critique: one or two sentences that name the dose and the sheet line. Then write the verdict: pass or fail. Answer in this shape:

{"critique": "...", "verdict": "pass"}
