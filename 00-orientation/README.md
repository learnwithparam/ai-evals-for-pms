# Start here

You will set up the files, meet Lantern Trails, run the finished system and see your goal. Then you write down the one question you must answer.

```mermaid
flowchart LR
  A[Get the files] --> B[Meet the world in the viewer]
  B --> C[Run the finished system]
  C --> D[See your goal]
  D --> E[question.md]
  E --> F[bun run verify meet-lantern-trails]
```

## Set up

1. Get the files. On GitHub, click **Code**, then **Download ZIP**, and unzip it. Or clone the repo if you use git.
2. Install [Bun](https://bun.sh). It runs the checks. The Bun page gives you one line to paste.
3. Open a terminal in the course folder and run:

```bash
bun install
```

Expect: `bun install` ends with no errors.

```bash
bun run world
```

Expect: `Lantern Trails is ready: 300 traces, 220 catalogue items, 300 requests.`

## Meet the world

Open `world/viewer.html` with a double-click. It opens in your browser. Nothing is sent anywhere.

Read the **Meet Lantern Trails** tab. It tells you who the company is, what Draft Planner does, who Ines Duarte is, and what the boss asked you.

![The Meet Lantern Trails tab in the viewer](meet-lantern-trails/images/expected.png)

## Run the finished system

```bash
bun run finished
```

Expect: `The finished work passes: 4 of 4 steps.`

![bun run finished: a draft, the checks, and the counts](../images/finished-system.png)

## See your goal

Open the **Your goal** tab in the viewer. It lists the launch pack you will build, part by part.

## Walkthrough

Your first step is [meet-lantern-trails](meet-lantern-trails/problem/README.md). Fill in `question.md`, then run:

```bash
bun run verify meet-lantern-trails
```

Expect: `FAIL` lines, each with a `Try next:` line. That is the start: every step begins failing. Fill in `question.md` and run it again to see `Done. All 5 rules pass.`

When a command prints something you do not expect, look it up in [troubleshooting.md](troubleshooting.md).
