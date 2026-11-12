// The house rules of Lantern Trails, written as code. A draft that breaks none of them is one Ines would send.
// The generator uses these to prove every planted fault is the only fault in its trace.
import type { Item, Trace } from "./generate";

export const TRANSFER_LIMIT_MINUTES = 150;
const MAX_STOPS = { relaxed: 3, balanced: 4, full: 5 } as const;

export function findFaults(t: Trace, cat: Map<string, Item>): string[] {
  const r = t.request;
  const out = new Set<string>();
  if (t.draft.total_eur_per_person > r.budget_eur_per_person) out.add("over-budget");
  for (const d of t.draft.days) {
    const acts = d.items.filter((i) => i.type !== "restaurant");
    if (acts.length > MAX_STOPS[r.pace]) out.add("wrong-pace");
    for (const i of d.items) {
      const c = cat.get(i.catalogue_id);
      if (!c) { out.add("not-in-catalogue"); continue; }
      if (c.closed_day === d.weekday) out.add("closed-on-the-day");
      const m = Number(d.date.slice(5, 7));
      if (c.season !== "all year" && (m <= 3 || m >= 11)) out.add("out-of-season");
      if (r.mobility === "wheelchair" && c.access !== "step-free") out.add("ignores-mobility");
      if (r.mobility === "limited walking" && c.access === "steep steps") out.add("ignores-mobility");
      if (c.food) {
        if (r.diet === "vegetarian" && c.vegetarian_ok !== "yes") out.add("diet-missed");
        if (r.diet === "vegan" && c.vegan_ok !== "yes") out.add("diet-missed");
        if (r.diet === "no seafood" && /seafood/.test(c.food)) out.add("diet-missed");
      }
      if (typeof i.travel_min_from_last === "number" && i.travel_min_from_last > TRANSFER_LIMIT_MINUTES) out.add("impossible-transfer");
    }
  }
  return [...out].sort();
}
