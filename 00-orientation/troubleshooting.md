# When something goes wrong

Sometimes a command prints a message you do not expect. Do not worry. This page lists every message the course scripts print when something fails.

How to use this page:

1. Find the words you see in the first column.
2. Read what they mean in the second column.
3. Do the fix in the third column.

For example, you type `bun run draft R999`. There is no request R999, so the script prints this:

```text
There is no request called "R999". Try R001 to R300.
```

Find `There is no request called` in the table. The fix says to run `bun run draft R020`, a request that exists.

In the table, `...` stands for a word that changes, like a step name. The letters `x` and `y` stand for numbers.

| What you see                                                                | What it means                                                             | Fix                                                                    |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `bun: command not found`                                                    | Bun is not installed, or you opened the terminal before you installed it. | Install Bun from bun.sh. Then close the terminal and open a new one.   |
| `There is no step called "..."`                                             | The step name has a spelling mistake.                                     | Copy a step name from the list it prints.                              |
| `There is no part called "..."`                                             | The part name has a spelling mistake.                                     | Copy a part name from the list it prints.                              |
| `ERROR the check for ... could not load`                                    | The check itself is broken. Your work is not the problem.                 | Tell your teacher. Send them everything the command printed.           |
| `The world files are missing. Run: bun run world reset`                     | The `world/data` folder is gone or empty.                                 | Run `bun run world reset`.                                             |
| `The counts are wrong. Run: bun run world reset`                            | Someone changed a world file by hand.                                     | Run `bun run world reset`. It puts every file back the way it was.     |
| `Unknown option "...". Use: bun run world, or bun run world reset.`         | You typed an extra word after `bun run world`.                            | Use one of the two commands it names.                                  |
| `There is no request called "...". Try R001 to R300.`                       | `bun run draft` needs a request name, from R001 to R300.                  | Run `bun run draft R020`.                                              |
| `LLM_PROVIDER is "..."`                                                     | Your `.env` file names a model company the course does not know.          | Use replay, anthropic, openrouter, openai or ollama.                   |
| `LLM_PROVIDER is ... but ..._API_KEY is not set`                            | You picked a real model, but you did not add its key.                     | Add the key to `.env`, or set `LLM_PROVIDER=replay`.                   |
| `LLM_PROVIDER is ollama but OLLAMA_MODEL is not set.`                       | Ollama needs the name of a model you downloaded.                          | Set `OLLAMA_MODEL` in `.env`.                                          |
| `... role(s) failed.` from `bun run models`                                 | A real model did not answer.                                              | Check the key and the provider name. Or go back to replay.             |
| `The world data did not load.` in the viewer                                | `viewer.html` is no longer next to its `data` folder.                     | Open `world/viewer.html` from inside the course folder.                |
| `That file has no mode and count columns.` in the viewer                    | The chart needs a first row that says `mode,count`.                       | Fix the first row of `counts.csv`. Then choose the file again.         |
| `FAIL ...` then `Try next: ...`                                             | One rule in the step is not met yet.                                      | Do what the Try next line says. Save the file and run the check again. |
| `x of y rules pass. Fix the FAIL lines and run it again.`                   | Some rules still fail.                                                    | Work on the FAIL lines one at a time.                                  |
| `x/y steps pass. Run bun run verify <step-name> on a FAIL line to see why.` | Some steps in the part are not done yet.                                  | Run the check for the step that failed.                                |
| `The finished work passes: x of 17 steps.` with x below 17                  | A sample answer no longer passes its check.                               | Run `bun run world reset`. If it still fails, tell your teacher.       |
| A CSV opens as one long column                                              | Your spreadsheet did not split the text at each comma.                    | Use File, then Import. Pick comma as the separator.                    |
| The check cannot find `notes.csv`                                           | The file is still in your Downloads folder.                               | Move it into the step's `problem` folder.                              |
