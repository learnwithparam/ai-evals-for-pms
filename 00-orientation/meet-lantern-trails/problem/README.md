# Meet Lantern Trails

## The problem

Draft Planner writes trip drafts for Lantern Trails. Designers fix many of them before they go out. The boss must decide two things: switch to a cheaper model, and send some drafts with no designer. Nobody can say how often Draft Planner gets a trip wrong. Before you measure anything, you need to know two things: what question you are answering, and who decides what "good" means.

Anthropic, which builds AI models, puts it this way: "The people closest to product requirements and users are best positioned to define success." ([Anthropic](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents))

![The Meet Lantern Trails tab in the viewer](../images/expected.png)

## Your challenge

1. Open `world/viewer.html` and read the **Meet Lantern Trails** tab.
2. Open `question.md` in this folder. Fill in both lines in your own words:
   - `Question:` the question the boss asked you. Start it with "How often".
   - `Who decides:` the person whose word sets what a good draft is.

## Done when

- The world is in place: 300 drafts and 220 catalogue items.
- Draft Planner runs three times with no key and logs every run.
- `question.md` is in this folder.
- The `Question:` line asks how often something goes wrong.
- The `Who decides:` line names the head designer, Ines Duarte.

```bash
bun run verify meet-lantern-trails
```

Expect: `Done. All 5 rules pass.` and a `Progress:` line.

## If you get stuck

| What you see | Fix |
|---|---|
| `FAIL the world is in place` | Run `bun run world reset`. |
| `FAIL the Question: line asks how often` | Start the line with `Question: How often` and write at least 6 words. |
| `FAIL the Who decides: line names the head designer` | The boss signs budgets, not trips. Read the tab again and find who signs off every trip. |

## Words you will use

- **Draft Planner**: the AI tool that writes a first trip draft from a customer form.
- **Trace**: the record of one Draft Planner run: the request, what it looked up, and the draft it wrote.
- **Domain expert**: the person whose judgement sets what good means. Here, Ines Duarte.
- **Replay**: a mode where Draft Planner gives back a reply it recorded before, so nothing needs a key.
