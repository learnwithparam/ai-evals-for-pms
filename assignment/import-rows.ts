// bun assignment/import-rows.ts: loads the 40 golden-set drafts into a Langfuse annotation queue.
// The course team runs this once and shares the queue link. A learner does not run it.
import { dataCsv, traces } from "../world/world";
import { type Connection, callLangfuse, connect, QUEUE_NAME, SCORE_NAME } from "./langfuse";

const connection = connect();

async function mustSucceed(label: string, call: Promise<Answer>) {
  const outcome = await call;
  if (outcome.status >= 300) {
    console.error(`${label} failed with status ${outcome.status}: ${JSON.stringify(outcome.json)}`);
    process.exit(1);
  }
  return outcome.json;
}

async function createScoreConfig(link: Connection): Promise<string> {
  const categories = [
    { label: "pass", value: 1 },
    { label: "fail", value: 0 },
  ];
  const body = { name: SCORE_NAME, dataType: "CATEGORICAL", categories };
  const created = await mustSucceed(
    "Creating the score",
    callLangfuse(link, "POST", "/api/public/score-configs", body),
  );
  return created.id;
}

async function createTraces(link: Connection, ids: string[]) {
  const draftsById = new Map(traces().map((trace) => [trace.trace_id, trace]));
  const batch = ids.map((id) => {
    const trace = draftsById.get(id);
    const body = { id, name: "draft-planner", input: trace?.request, output: trace?.draft };
    return {
      id: crypto.randomUUID(),
      type: "trace-create",
      timestamp: new Date().toISOString(),
      body,
    };
  });
  await mustSucceed(
    "Loading the drafts",
    callLangfuse(link, "POST", "/api/public/ingestion", { batch }),
  );
}

async function createQueue(link: Connection, scoreConfigId: string): Promise<string> {
  const body = {
    name: QUEUE_NAME,
    description: "Label each draft pass or fail for mobility. Add a comment on every fail.",
    scoreConfigIds: [scoreConfigId],
  };
  const created = await mustSucceed(
    "Creating the queue",
    callLangfuse(link, "POST", "/api/public/annotation-queues", body),
  );
  return created.id;
}

async function addQueueItems(link: Connection, queueId: string, ids: string[]) {
  for (const id of ids) {
    const body = { objectId: id, objectType: "TRACE" };
    const path = `/api/public/annotation-queues/${queueId}/items`;
    await mustSucceed(`Adding ${id}`, callLangfuse(link, "POST", path, body));
  }
}

const goldenIds = dataCsv("golden-set.csv").map((row) => row.trace_id);
const scoreConfigId = await createScoreConfig(connection);
await createTraces(connection, goldenIds);
const queueId = await createQueue(connection, scoreConfigId);
await addQueueItems(connection, queueId, goldenIds);
const projects = await mustSucceed(
  "Finding the project",
  callLangfuse(connection, "GET", "/api/public/projects"),
);
const projectId = projects.data?.[0]?.id ?? "<project>";
console.log(`Loaded ${goldenIds.length} drafts into the queue.`);
console.log(`Queue link: ${connection.host}/project/${projectId}/annotation-queues/${queueId}`);
