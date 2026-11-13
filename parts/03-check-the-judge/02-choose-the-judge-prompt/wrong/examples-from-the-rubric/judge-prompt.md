# Judge prompt: ignores mobility needs

You check one thing in a Lantern Trails trip draft: can the traveller use every stop? Read the mobility line of the request. Then read the Access line of every stop.

## Pass

Every stop in the draft suits the traveller's mobility. For a wheelchair user, every stop is step-free. For a traveller with limited walking, no stop has steep steps. A request with no mobility need passes.

## Fail

The draft books at least one stop the traveller cannot use. That means a stop that is not step-free for a wheelchair user, or a stop with steep steps for a traveller with limited walking.

## Borderline rule

A stop with some steps passes for a traveller with limited walking. The same stop fails for a wheelchair user.

## Examples

- T068: pass. Ribeira Kitchen No. 2 has a few steps, which is fine for limited walking.
- T056: fail. Foz Hilltop Lanes Walk has steep steps, and the traveller uses a wheelchair.
- T149: fail. Ribeira Hilltop Lanes Walk has steep steps, and the traveller has limited walking.

## Output

First write a critique: one or two sentences that name the stop and its Access line. Then write the verdict: pass or fail. Answer in this shape:

{"critique": "...", "verdict": "pass"}
