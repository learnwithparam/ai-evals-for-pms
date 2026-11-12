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

export const faultyIds = (set?: string) =>
  new Set(
    planted()
      .filter((p) => p.mode !== "none" && (!set || p.set === set))
      .map((p) => p.trace_id),
  );
