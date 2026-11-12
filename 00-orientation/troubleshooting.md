# When something goes wrong

Every message a script prints on failure is in this table. Find the words you see, then do the fix.

| What you see | What it means | Fix |
|---|---|---|
| `bun: command not found` | Bun is not installed, or the terminal opened before you installed it. | Install it from bun.sh, then open a new terminal. |
| `There is no step called "..."` | The step name is spelled wrong. | Copy a name from the list it prints. |
| `There is no part called "..."` | The part name is spelled wrong. | Copy a name from the list it prints. |
| `ERROR the check for ... could not load` | The check itself is broken, not your work. | Tell your facilitator and send the full output. |
| `The world files are missing. Run: bun run world reset` | The `world/data` folder is gone or empty. | Run `bun run world reset`. |
| `The counts are wrong. Run: bun run world reset` | A world file was changed by hand. | Run `bun run world reset`. It puts every file back. |
| `Unknown option "...". Use: bun run world, or bun run world reset.` | You typed another word after `bun run world`. | Use one of the two commands it names. |
| `There is no request called "...". Try R001 to R300.` | `bun run draft` needs a request id. | Run `bun run draft R020`. |
| `LLM_PROVIDER is "..."` | Your `.env` names a provider the course does not know. | Use replay, anthropic, openrouter, openai or ollama. |
| `LLM_PROVIDER is ... but ..._API_KEY is not set` | You picked a real model but did not add its key. | Add the key to `.env`, or set `LLM_PROVIDER=replay`. |
| `LLM_PROVIDER is ollama but OLLAMA_MODEL is not set.` | Ollama needs the name of a model you pulled. | Set `OLLAMA_MODEL` in `.env`. |
| `... role(s) failed.` from `bun run models` | A real model did not answer. | Check the key and the provider, or go back to replay. |
| `The world data did not load.` in the viewer | `viewer.html` was moved away from its `data` folder. | Open `world/viewer.html` from inside the course folder. |
| `That file has no mode and count columns.` in the viewer | The chart needs a first row that says `mode,count`. | Fix the first row of `counts.csv` and choose it again. |
| `FAIL ...` then `Try next: ...` | One rule in a step is not met yet. | Do what the Try next line says, save, and run the check again. |
| `x of y rules pass. Fix the FAIL lines and run it again.` | Some rules still fail. | Work on the FAIL lines one at a time. |
| `x/y steps pass. Run bun run verify <step-name> on a FAIL line to see why.` | Some steps in a part are not done. | Run the check for the step that failed. |
| `The finished work passes: x of 4 steps.` with x below 4 | A sample answer no longer passes its check. | Run `bun run world reset`. If it still fails, tell your facilitator. |
| A CSV opens as one long column | Your spreadsheet did not split on commas. | Use File, Import, and pick comma as the separator. |
| The check cannot find `notes.csv` | The file is still in your Downloads folder. | Move it into the step's `problem` folder. |
