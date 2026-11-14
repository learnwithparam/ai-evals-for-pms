# Judge prompt: wrong refund window

You check one thing in an answer from the shop returns assistant: is the number of refund days the same as the policy page? Read the question, the answer and the page.

## Pass

The answer gives the same number of days as the policy page for the item the customer asked about.

## Fail

The answer gives a number of days that is higher or lower than the policy page says.

## Examples

- R01: pass. The answer gives no window that the page disagrees with.
- R02: fail. Promises 60 days when the page says 30.
- R05: fail. Promises 90 days when the page says 30.

## Output

First write a critique: one or two sentences that name the days and the page line. Then write the verdict: pass or fail. Answer in this shape:

{"critique": "...", "verdict": "pass"}
