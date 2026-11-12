// What a check may know about the world: the shipped data and the answer key. Never a model reply.
export {
  catalogue,
  dataCsv,
  LOGS,
  planted,
  sampleIds,
  traces,
  worldExists,
} from "../../world/world";

import { planted } from "../../world/world";

// The ids of the drafts the answer key says have a real problem, in one set or in all of them.
export function faultyIds(set?: string): Set<string> {
  const isFaulty = (row: Record<string, string>) =>
    row.mode !== "none" && (!set || row.set === set);
  const faultyRows = planted().filter(isFaulty);
  return new Set(faultyRows.map((row) => row.trace_id));
}
