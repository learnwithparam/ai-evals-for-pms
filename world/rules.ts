// The house rules of Lantern Trails, written as code. A draft that breaks none of them is one
// Ines would send. The generator uses these to prove every planted fault is the only fault in its
// trace.
import type { Item, Trace } from "./generate";

export const TRANSFER_LIMIT_MINUTES = 150;
const MOST_STOPS_A_DAY = { relaxed: 3, balanced: 4, full: 5 } as const;

type Request = Trace["request"];
type Day = Trace["draft"]["days"][number];
type DraftItem = Day["items"][number];

// Many places close in the low season, from November to March.
function isLowSeason(date: string): boolean {
  const month = Number(date.slice(5, 7));
  return month <= 3 || month >= 11;
}

function ignoresMobility(request: Request, place: Item): boolean {
  if (request.mobility === "wheelchair") return place.access !== "step-free";
  if (request.mobility === "limited walking") return place.access === "steep steps";
  return false;
}

function missesDiet(request: Request, place: Item): boolean {
  if (!place.food) return false;
  if (request.diet === "vegetarian") return place.vegetarian_ok !== "yes";
  if (request.diet === "vegan") return place.vegan_ok !== "yes";
  if (request.diet === "no seafood") return /seafood/.test(place.food);
  return false;
}

function isTooFarFromLastStop(item: DraftItem): boolean {
  const minutes = item.travel_min_from_last;
  return typeof minutes === "number" && minutes > TRANSFER_LIMIT_MINUTES;
}

function itemFaults(request: Request, day: Day, item: DraftItem, place: Item): string[] {
  const faults: string[] = [];
  if (place.closed_day === day.weekday) faults.push("closed-on-the-day");
  if (place.season !== "all year" && isLowSeason(day.date)) faults.push("out-of-season");
  if (ignoresMobility(request, place)) faults.push("ignores-mobility");
  if (missesDiet(request, place)) faults.push("diet-missed");
  if (isTooFarFromLastStop(item)) faults.push("impossible-transfer");
  return faults;
}

function dayFaults(request: Request, day: Day, catalogue: Map<string, Item>): string[] {
  const faults: string[] = [];
  const stops = day.items.filter((item) => item.type !== "restaurant");
  if (stops.length > MOST_STOPS_A_DAY[request.pace]) faults.push("wrong-pace");
  for (const item of day.items) {
    const place = catalogue.get(item.catalogue_id);
    if (place) faults.push(...itemFaults(request, day, item, place));
    else faults.push("not-in-catalogue");
  }
  return faults;
}

// Every house rule the draft breaks, each named once, in alphabetical order.
export function findFaults(trace: Trace, catalogue: Map<string, Item>): string[] {
  const request = trace.request;
  const faults = new Set<string>();
  if (trace.draft.total_eur_per_person > request.budget_eur_per_person) faults.add("over-budget");
  for (const day of trace.draft.days) {
    for (const fault of dayFaults(request, day, catalogue)) faults.add(fault);
  }
  return [...faults].sort();
}
