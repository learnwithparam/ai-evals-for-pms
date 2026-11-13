# Launch criteria for Draft Planner

A release ships only if it meets every row. A critical row blocks the launch on its own.

| Mode                    | Metric                     | Threshold | Measured on             | Critical | Owner            |
| ----------------------- | -------------------------- | --------- | ----------------------- | -------- | ---------------- |
| Ignores mobility needs  | drafts that fail this mode | at most 1 | release set, 150 drafts | no       | Ines Duarte      |
| Wrong food for the diet | drafts that fail this mode | at most 1 | release set, 150 drafts | no       | Ines Duarte      |
| Closed on the day       | drafts that fail this mode | at most 6 | release set, 150 drafts | no       | engineering lead |
| Over budget             | drafts that fail this mode | at most 5 | release set, 150 drafts | no       | engineering lead |
| Impossible travel       | drafts that fail this mode | at most 4 | release set, 150 drafts | no       | engineering lead |

A designer still reads every draft today. So a critical mode is one that would hurt a traveller if a draft went out with no designer.
