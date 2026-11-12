// Builds the Lantern Trails world from a fixed seed. The same seed always writes the same files,
// so `bun run world reset` puts every file back exactly as it shipped.
// The generator writes the answer key (planted.csv). No label in this world comes from a model.
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { findFaults } from "./rules";

export const SEED = 2027;
export const DATA = join(import.meta.dir, "data");

// ---------- random numbers that repeat ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let R = rng(SEED);
const rand = () => R();
const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pad = (n: number, w = 3) => String(n).padStart(w, "0");

// ---------- places ----------
export type Area = { id: string; name: string; region: "lisbon" | "porto" | "algarve"; x: number; y: number; water: boolean };
export const AREAS: Area[] = [
  { id: "lisbon-baixa", name: "Lisbon Baixa", region: "lisbon", x: 0, y: 0, water: true },
  { id: "lisbon-alfama", name: "Lisbon Alfama", region: "lisbon", x: 2, y: 1, water: true },
  { id: "lisbon-belem", name: "Lisbon Belem", region: "lisbon", x: -7, y: -1, water: true },
  { id: "sintra", name: "Sintra", region: "lisbon", x: -25, y: 12, water: false },
  { id: "cascais", name: "Cascais", region: "lisbon", x: -28, y: -3, water: true },
  { id: "obidos", name: "Obidos", region: "lisbon", x: -20, y: 80, water: false },
  { id: "evora", name: "Evora", region: "lisbon", x: 110, y: -20, water: false },
  { id: "porto-ribeira", name: "Porto Ribeira", region: "porto", x: 30, y: 280, water: true },
  { id: "porto-foz", name: "Porto Foz", region: "porto", x: 24, y: 282, water: true },
  { id: "douro-regua", name: "Douro Regua", region: "porto", x: 100, y: 275, water: true },
  { id: "douro-pinhao", name: "Douro Pinhao", region: "porto", x: 125, y: 280, water: true },
  { id: "algarve-lagos", name: "Algarve Lagos", region: "algarve", x: -10, y: -230, water: true },
  { id: "algarve-faro", name: "Algarve Faro", region: "algarve", x: 60, y: -240, water: true },
  { id: "algarve-tavira", name: "Algarve Tavira", region: "algarve", x: 90, y: -235, water: true },
];
const areaById = Object.fromEntries(AREAS.map((a) => [a.id, a]));

export function carMinutes(a: string, b: string): number {
  if (a === b) return 15;
  const A = areaById[a], B = areaById[b];
  const km = Math.hypot(A.x - B.x, A.y - B.y) * 1.25;
  return Math.round((km / 80) * 60 + 15);
}
export function trainMinutes(a: string, b: string): number | "" {
  if (a === b) return "";
  const A = areaById[a], B = areaById[b];
  if (!A.water && !B.water && A.region !== B.region) return "";
  return Math.round(carMinutes(a, b) * 1.15 + 10);
}

// ---------- the supplier catalogue ----------
export type Item = {
  id: string; name: string; area: string; type: string; closed_day: string; opens: string; closes: string;
  season: string; price_eur: number; access: "step-free" | "some steps" | "steep steps"; child_friendly: "yes" | "no";
  food: string; vegetarian_ok: "yes" | "no" | ""; vegan_ok: "yes" | "no" | ""; min_notice_days: number;
};
const WALKS = ["Old Quarter Walk", "Hilltop Lanes Walk", "Riverside Stroll", "Viewpoints Walk", "Market Walk", "Garden Walk"];
const MUSEUMS = ["Tile and Craft Museum", "Sea Stories Museum", "Old Trams Museum", "Town History House", "Cork Workshop Museum"];
const TASTINGS = ["Cellar Tasting", "Cheese and Bread Tasting", "Sardine Tin Tasting", "Olive Oil Tasting", "Pastry Class"];
const BOATS = ["River Boat Trip", "Sunset Sail", "Dolphin Boat Trip", "Coast Kayak Trip"];
const ACTIVITIES = ["Tile Painting Class", "Bike Ride", "Cooking Class", "Tram Ride", "Beach Afternoon", "Vineyard Visit"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function makeCatalogue(): Item[] {
  const items: Item[] = [];
  let n = 1;
  const add = (p: Omit<Item, "id">) => items.push({ id: `C${pad(n++)}`, ...p });
  for (const area of AREAS) {
    const short = area.name.replace(/^(Lisbon|Porto|Algarve|Douro) /, "");
    const k = area.region === "algarve" ? 15 : 16;
    // Each area gets at least: one steep walk, one gentle walk, one museum shut on Mondays, one step-free
    // museum open daily, a seafood-only place, a vegetarian-friendly place, and a hotel.
    add({ name: `${short} ${WALKS[1]}`, area: area.id, type: "walk", closed_day: "", opens: "09:00", closes: "18:00", season: "all year", price_eur: int(25, 40), access: "steep steps", child_friendly: "yes", food: "", vegetarian_ok: "", vegan_ok: "", min_notice_days: 1 });
    add({ name: `${short} ${WALKS[2]}`, area: area.id, type: "walk", closed_day: "", opens: "09:00", closes: "18:00", season: "all year", price_eur: int(20, 35), access: "step-free", child_friendly: "yes", food: "", vegetarian_ok: "", vegan_ok: "", min_notice_days: 1 });
    add({ name: `${short} ${pick(MUSEUMS)}`, area: area.id, type: "museum", closed_day: "Monday", opens: "10:00", closes: "18:00", season: "all year", price_eur: int(8, 16), access: "step-free", child_friendly: "yes", food: "", vegetarian_ok: "", vegan_ok: "", min_notice_days: 0 });
    add({ name: `${short} Art House`, area: area.id, type: "museum", closed_day: "", opens: "10:00", closes: "19:00", season: "all year", price_eur: int(8, 14), access: "step-free", child_friendly: "yes", food: "", vegetarian_ok: "", vegan_ok: "", min_notice_days: 0 });
    add({ name: `${short} Kitchen No. ${int(1, 9)}`, area: area.id, type: "restaurant", closed_day: "Sunday", opens: "12:00", closes: "23:00", season: "all year", price_eur: int(30, 55), access: "some steps", child_friendly: "yes", food: "seafood only", vegetarian_ok: "no", vegan_ok: "no", min_notice_days: 0 });
    add({ name: `${short} Green Table`, area: area.id, type: "restaurant", closed_day: "", opens: "12:00", closes: "23:00", season: "all year", price_eur: int(25, 45), access: "step-free", child_friendly: "yes", food: "vegetarian and vegan dishes", vegetarian_ok: "yes", vegan_ok: "yes", min_notice_days: 0 });
    add({ name: `${short} Courtyard Hotel`, area: area.id, type: "hotel", closed_day: "", opens: "", closes: "", season: "all year", price_eur: int(70, 140), access: "step-free", child_friendly: "yes", food: "", vegetarian_ok: "", vegan_ok: "", min_notice_days: 2 });
    if (area.water) add({ name: `${short} ${pick(BOATS)}`, area: area.id, type: "boat", closed_day: "", opens: "10:00", closes: "19:00", season: "April to October", price_eur: int(25, 60), access: "some steps", child_friendly: "yes", food: "", vegetarian_ok: "", vegan_ok: "", min_notice_days: 2 });
    while (items.filter((i) => i.area === area.id).length < k) {
      const t = pick(["walk", "tasting", "tasting", "restaurant", "restaurant", "activity", "activity", "museum"]);
      const name =
        t === "walk" ? `${short} ${pick([WALKS[0], WALKS[3], WALKS[4], WALKS[5]])}` :
        t === "tasting" ? `${short} ${pick(TASTINGS)}` :
        t === "restaurant" ? `${short} ${pick(["Tasca", "Grill", "Bistro", "Canteen"])} No. ${int(1, 9)}` :
        t === "museum" ? `${short} ${pick(MUSEUMS)}` : `${short} ${pick(ACTIVITIES)}`;
      if (items.some((i) => i.name === name)) continue;
      const food = t === "restaurant" ? pick(["meat and fish", "seafood only", "mixed menu", "mixed menu"]) : t === "tasting" ? pick(["wine and cheese", "seafood", "pastries"]) : "";
      const veg = food === "" ? "" : food === "seafood only" || food === "seafood" ? "no" : "yes";
      add({
        name, area: area.id, type: t, closed_day: t === "museum" ? "Monday" : t === "restaurant" ? pick(["", "", "Monday", "Sunday"]) : "",
        opens: t === "restaurant" ? "12:00" : "09:30", closes: t === "restaurant" ? "23:00" : "18:30",
        season: t === "activity" && name.includes("Beach") ? "April to October" : "all year",
        price_eur: t === "museum" ? int(8, 16) : t === "restaurant" ? int(25, 55) : int(20, 65),
        access: pick(["step-free", "step-free", "some steps", "steep steps"]) as Item["access"],
        child_friendly: t === "tasting" && food === "wine and cheese" ? "no" : "yes",
        food, vegetarian_ok: veg as Item["vegetarian_ok"], vegan_ok: (veg === "yes" && rand() < 0.4 ? "yes" : veg === "" ? "" : "no") as Item["vegan_ok"],
        min_notice_days: int(0, 3),
      });
    }
  }
  return items.slice(0, 220);
}

// ---------- requests, drafts and planted faults ----------
export const MODES = [
  "closed-on-the-day", "impossible-transfer", "ignores-mobility", "not-in-catalogue",
  "over-budget", "wrong-pace", "diet-missed", "out-of-season",
] as const;
export type Mode = (typeof MODES)[number] | "none";

type Request = {
  request_id: string; trip_type: "city break" | "custom tour"; region: string; start_date: string; nights: number;
  adults: number; children_ages: string; mobility: "none" | "wheelchair" | "limited walking"; diet: "none" | "vegetarian" | "vegan" | "no seafood";
  pace: "relaxed" | "balanced" | "full"; interests: string; budget_eur_per_person: number;
};
type DraftItem = {
  time: string; catalogue_id: string; name: string; area: string; type: string; price_eur: number;
  access: string; closed_day: string; season: string; food: string; travel_min_from_last: number | "";
};
type Day = { date: string; weekday: string; items: DraftItem[] };
export type Trace = {
  trace_id: string; request_id: string; request: Request; lookups: { asked_for: string; found: string }[];
  draft: { hotel: DraftItem; days: Day[]; total_eur_per_person: number }; outcome: string; designer_minutes: number;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => { const d = new Date(s + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const weekday = (s: string) => DAYS[new Date(s + "T12:00:00Z").getUTCDay()];
const winter = (s: string) => { const m = Number(s.slice(5, 7)); return m <= 3 || m >= 11; };
const inSeason = (i: Item, date: string) => i.season === "all year" || !winter(date);

function okFor(i: Item, r: Request, date: string): boolean {
  if (i.closed_day && i.closed_day === weekday(date)) return false;
  if (!inSeason(i, date)) return false;
  if (r.mobility === "wheelchair" && i.access !== "step-free") return false;
  if (r.mobility === "limited walking" && i.access === "steep steps") return false;
  if (i.food) {
    if (r.diet === "vegetarian" && i.vegetarian_ok !== "yes") return false;
    if (r.diet === "vegan" && i.vegan_ok !== "yes") return false;
    if (r.diet === "no seafood" && /seafood/.test(i.food)) return false;
  }
  if (r.children_ages && i.child_friendly === "no") return false;
  return true;
}

const SLOTS = ["09:30", "11:30", "14:30", "16:30", "17:45", "18:30"];
const toItem = (i: Item, time: string, from: string | null): DraftItem => ({
  time, catalogue_id: i.id, name: i.name, area: i.area, type: i.type, price_eur: i.price_eur, access: i.access,
  closed_day: i.closed_day, season: i.season, food: i.food, travel_min_from_last: from ? carMinutes(from, i.area) : "",
});

const REGION_AREAS: Record<string, string[]> = {
  lisbon: ["lisbon-baixa", "lisbon-alfama", "lisbon-belem", "sintra", "cascais", "obidos", "evora"],
  porto: ["porto-ribeira", "porto-foz", "douro-regua", "douro-pinhao"],
  algarve: ["algarve-lagos", "algarve-faro", "algarve-tavira"],
};
const INTERESTS = ["food", "history", "views", "wine", "the sea", "art", "markets", "gardens"];

function makeRequest(n: number, need: Mode, extra: { mobility?: Request["mobility"]; borderline?: boolean }): Request {
  const region = pick(["lisbon", "lisbon", "porto", "porto", "algarve"]);
  const city = rand() < 0.45 && need !== "wrong-pace";
  const nights = city ? 2 : int(3, 4);
  let start = iso(new Date(Date.UTC(2027, int(0, 11), int(1, 26))));
  if (need === "out-of-season") start = iso(new Date(Date.UTC(2027, pick([0, 1, 2, 10]), int(1, 24))));
  if (need === "closed-on-the-day") {
    // Move the start so the second day is a Monday.
    while (weekday(addDays(start, 1)) !== "Monday") start = addDays(start, 1);
  }
  const kids = need === "wrong-pace" ? String(int(2, 4)) : rand() < 0.2 ? `${int(5, 9)}, ${int(10, 15)}` : "";
  const mobility = extra.mobility ?? (need === "ignores-mobility" ? pick(["wheelchair", "wheelchair", "limited walking"]) : rand() < 0.12 ? pick(["wheelchair", "limited walking"]) : "none");
  return {
    request_id: `R${pad(n)}`, trip_type: city ? "city break" : "custom tour", region, start_date: start, nights,
    adults: int(1, 4), children_ages: kids, mobility: mobility as Request["mobility"],
    diet: need === "diet-missed" ? pick(["vegetarian", "vegetarian", "vegan"]) : (pick(["none", "none", "none", "none", "vegetarian", "no seafood"]) as Request["diet"]),
    pace: need === "wrong-pace" ? "relaxed" : (pick(["relaxed", "balanced", "balanced", "full"]) as Request["pace"]),
    interests: shuffle(INTERESTS).slice(0, 2).join(", "), budget_eur_per_person: 0,
  };
}

function buildDraft(r: Request, cat: Item[], borderline: boolean): { hotel: DraftItem; days: Day[] } {
  const areas = REGION_AREAS[r.region];
  const hotelArea = areas[0] === "lisbon-baixa" ? pick(["lisbon-baixa", "lisbon-alfama"]) : areas[0] === "porto-ribeira" ? "porto-ribeira" : pick(areas);
  const hotel = cat.find((i) => i.area === hotelArea && i.type === "hotel")!;
  const perDay = r.pace === "relaxed" ? 2 : r.pace === "balanced" ? 3 : 4;
  const used = new Set<string>();
  const days: Day[] = [];
  for (let d = 0; d < r.nights; d++) {
    const date = addDays(r.start_date, d);
    const area = d === 0 ? hotelArea : pick(areas.slice(0, Math.min(areas.length, 4)));
    const pool = cat.filter((i) => i.area === area && i.type !== "hotel" && i.type !== "restaurant" && !used.has(i.id) && okFor(i, r, date));
    // A borderline trace for limited walking: include a place with some steps (Ines passes it).
    let acts = shuffle(pool).slice(0, perDay);
    if (borderline && d === 1) {
      const some = cat.find((i) => i.area === area && i.access === "some steps" && i.type !== "restaurant" && i.type !== "hotel" && okFor(i, r, date) && !used.has(i.id));
      if (some) acts = [some, ...acts.filter((a) => a.id !== some.id)].slice(0, perDay);
    }
    const food = shuffle(cat.filter((i) => i.area === area && i.type === "restaurant" && !used.has(i.id) && okFor(i, r, date)))[0]
      ?? shuffle(cat.filter((i) => i.area === hotelArea && i.type === "restaurant" && okFor(i, r, date)))[0];
    let last: string | null = d === 0 ? hotelArea : hotelArea;
    const items: DraftItem[] = [];
    acts.forEach((a, k) => { items.push(toItem(a, SLOTS[k], last)); last = a.area; used.add(a.id); });
    if (food) { items.push(toItem(food, "19:30", last)); used.add(food.id); }
    days.push({ date, weekday: weekday(date), items });
  }
  return { hotel: toItem(hotel, "", null), days };
}

const total = (h: DraftItem, days: Day[], nights: number) =>
  h.price_eur * nights + days.reduce((a, d) => a + d.items.reduce((b, i) => b + i.price_eur, 0), 0);

// Changes one thing in a clean draft so it shows exactly one failure mode. Returns a one-line detail.
function plant(mode: Mode, r: Request, draft: { hotel: DraftItem; days: Day[] }, cat: Item[]): string {
  const day = draft.days[Math.min(1, draft.days.length - 1)];
  const swapActivity = (pred: (i: Item) => boolean, why: (i: Item) => string) => {
    const k = Math.max(0, day.items.findIndex((x) => x.type !== "restaurant"));
    const area = day.items[k]?.area ?? draft.hotel.area;
    const c = cat.find((i) => i.area === area && pred(i) && !day.items.some((x) => x.catalogue_id === i.id))
      ?? cat.find((i) => REGION_AREAS[r.region].includes(i.area) && pred(i))!;
    day.items[k] = { ...toItem(c, day.items[k]?.time ?? "11:30", null), travel_min_from_last: day.items[k]?.travel_min_from_last ?? 15 };
    return why(c);
  };
  switch (mode) {
    case "closed-on-the-day":
      return swapActivity((i) => i.closed_day === day.weekday && i.type === "museum" && okForBut(i, r, "closed"), (i) => `${i.name} is booked on a ${day.weekday}, but it is closed on ${i.closed_day}s.`);
    case "ignores-mobility": {
      const bad = r.mobility === "wheelchair" ? (i: Item) => i.access !== "step-free" : (i: Item) => i.access === "steep steps";
      return swapActivity((i) => bad(i) && i.type !== "restaurant" && i.type !== "hotel" && okForBut(i, r, "access", day.date), (i) => `${i.name} has ${i.access}, and the traveller ${r.mobility === "wheelchair" ? "uses a wheelchair" : "has limited walking"}.`);
    }
    case "out-of-season":
      return swapActivity((i) => i.season !== "all year" && okForBut(i, r, "season", day.date), (i) => `${i.name} runs ${i.season} only, and this trip is in ${new Date(day.date + "T12:00:00Z").toLocaleString("en-GB", { month: "long", timeZone: "UTC" })}.`);
    case "diet-missed": {
      const k = day.items.findIndex((x) => x.type === "restaurant");
      const c = cat.find((i) => i.area === day.items[k].area && i.type === "restaurant" && i.food === "seafood only" && i.closed_day !== day.weekday)
        ?? cat.find((i) => REGION_AREAS[r.region].includes(i.area) && i.food === "seafood only" && i.closed_day !== day.weekday)!;
      day.items[k] = { ...toItem(c, "19:30", null), travel_min_from_last: day.items[k].travel_min_from_last };
      return `${c.name} serves seafood only, and the party is ${r.diet}.`;
    }
    case "not-in-catalogue": {
      const name = pick(["Seaview Garden Restaurant", "Old Mill Wine Bar", "Blue Door Fado House", "Fisherman's Rest Cafe", "Hidden Courtyard Tavern"]);
      const k = day.items.findIndex((x) => x.type === "restaurant");
      day.items[k] = { time: "19:30", catalogue_id: "", name, area: day.items[k].area, type: "restaurant", price_eur: int(30, 50), access: "", closed_day: "", season: "", food: "", travel_min_from_last: day.items[k].travel_min_from_last };
      return `${name} is not in the supplier catalogue, so nobody can book it.`;
    }
    case "impossible-transfer": {
      const far = AREAS.filter((a) => a.region !== r.region);
      const target = pick(far);
      const c = cat.find((i) => i.area === target.id && i.type !== "hotel" && i.type !== "restaurant" && okFor(i, r, day.date))!;
      const k = Math.min(1, day.items.length - 1);
      const prev = day.items[k - 1]?.area ?? draft.hotel.area;
      day.items[k] = toItem(c, day.items[k].time, prev);
      if (day.items[k + 1]) day.items[k + 1].travel_min_from_last = carMinutes(c.area, day.items[k + 1].area);
      return `${c.name} is ${day.items[k].travel_min_from_last} minutes by car from the stop before it, with no time to get there.`;
    }
    case "wrong-pace": {
      const area = day.items[0]?.area ?? draft.hotel.area;
      const extra = cat.filter((i) => i.area === area && i.type !== "hotel" && i.type !== "restaurant" && okFor(i, r, day.date) && !day.items.some((x) => x.catalogue_id === i.id));
      const rest = day.items.filter((x) => x.type === "restaurant");
      const acts = [...day.items.filter((x) => x.type !== "restaurant"), ...extra.slice(0, 4).map((i) => toItem(i, "", area))].slice(0, 6);
      acts.forEach((a, k) => (a.time = SLOTS[k]));
      day.items = [...acts, ...rest.map((x) => ({ ...x, time: "19:30" }))];
      return `${day.items.length} stops in one day for a relaxed trip with a ${r.children_ages} year old.`;
    }
    default:
      return "";
  }
}
function okForBut(i: Item, r: Request, ignore: "closed" | "access" | "season", date?: string): boolean {
  if (ignore !== "access" && r.mobility === "wheelchair" && i.access !== "step-free") return false;
  if (ignore !== "access" && r.mobility === "limited walking" && i.access === "steep steps") return false;
  if (ignore !== "season" && date && !inSeason(i, date)) return false;
  if (ignore !== "closed" && date && i.closed_day === weekday(date)) return false;
  if (r.children_ages && i.child_friendly === "no") return false;
  return true;
}

// ---------- the plan: which trace carries which fault ----------
// sample-30: what the learner reads first. judge-120: the set the three judges and Ines labelled.
// rest-150: everything else. Counts are fixed so the course's numbers never drift.
const PLAN = {
  sample: { "closed-on-the-day": 3, "ignores-mobility": 3, "over-budget": 2, "impossible-transfer": 2, "diet-missed": 2, none: 18 },
  judge: { "ignores-mobility": 30, "closed-on-the-day": 3, "over-budget": 2, "wrong-pace": 2, "not-in-catalogue": 1, "out-of-season": 1, "impossible-transfer": 1, none: 80 },
  rest: { "closed-on-the-day": 8, "impossible-transfer": 5, "over-budget": 6, "not-in-catalogue": 5, "wrong-pace": 5, "diet-missed": 4, "out-of-season": 4, "ignores-mobility": 3, none: 110 },
} as const;

export function generate() {
  R = rng(SEED);
  const cat = makeCatalogue();
  const ids = shuffle(Array.from({ length: 300 }, (_, i) => i + 1));
  const roles: { n: number; set: "sample" | "judge" | "rest"; mode: Mode; mobility?: Request["mobility"]; borderline?: boolean; tries?: number }[] = [];
  let at = 0;
  for (const set of ["sample", "judge", "rest"] as const) {
    const modes: { mode: Mode; mobility?: Request["mobility"]; borderline?: boolean }[] = [];
    for (const [m, c] of Object.entries(PLAN[set])) for (let k = 0; k < c; k++) modes.push({ mode: m as Mode });
    if (set === "judge") {
      // 30 mobility fails: 20 wheelchair, 10 limited walking. 15 clean step-free requests, 6 of them borderline.
      let w = 0;
      for (const x of modes) if (x.mode === "ignores-mobility") x.mobility = w++ < 20 ? "wheelchair" : "limited walking";
      let c = 0;
      for (const x of modes) if (x.mode === "none" && c < 15) { x.mobility = c < 9 ? "wheelchair" : "limited walking"; x.borderline = c >= 9; c++; }
      for (const x of modes) if (!x.mobility) x.mobility = "none";
    }
    for (const x of shuffle(modes)) roles.push({ n: ids[at++], set, ...x });
  }
  roles.sort((a, b) => a.n - b.n);

  const catMap = new Map(cat.map((i) => [i.id, i]));
  const traces: Trace[] = [];
  const planted: { trace_id: string; set: string; mode: Mode; detail: string }[] = [];
  const redo: typeof roles = [];
  const queue = [...roles];
  while (queue.length) {
    const role = queue.shift()!;
    let r: Request, draft: { hotel: DraftItem; days: Day[] }, detail = "";
    for (let tries = 0; ; tries++) {
      r = makeRequest(role.n, role.mode, { mobility: role.mobility });
      if (role.mode === "impossible-transfer" || role.mode === "wrong-pace" || role.mode === "closed-on-the-day") r.nights = Math.max(r.nights, 2);
      draft = buildDraft(r, cat, Boolean(role.borderline));
      const fine = draft.days.every((d) => d.items.filter((x) => x.type !== "restaurant").length >= 2 && d.items.some((x) => x.type === "restaurant"));
      if (!fine && tries < 50) continue;
      try { detail = plant(role.mode, r, draft, cat); } catch { if (tries < 50) continue; throw new Error(`could not plant ${role.mode}`); }
      if (role.borderline && !draft.days.some((d) => d.items.some((x) => x.access === "some steps"))) { if (tries < 50) continue; }
      break;
    }
    const t = total(draft.hotel, draft.days, r.nights);
    r.budget_eur_per_person = role.mode === "over-budget" ? Math.round(t / 1.18) : Math.round((t * (1.06 + rand() * 0.2)) / 10) * 10;
    if (role.mode === "over-budget") detail = `The plan costs ${t} euros a person, ${Math.round((t / r.budget_eur_per_person - 1) * 100)}% over the ${r.budget_eur_per_person} euro budget.`;
    const tid = `T${pad(role.n)}`;
    const probe = { request: r, draft: { ...draft, total_eur_per_person: t } } as unknown as Trace;
    const found = findFaults(probe, catMap);
    const want = role.mode === "none" ? [] : [role.mode];
    if (found.join() !== want.join()) { role.tries = (role.tries ?? 0) + 1; if (role.tries > 400) throw new Error(`${tid}: wanted ${want} got ${found}`); queue.unshift(role); continue; }
    const lookups = [
      { asked_for: `hotel in ${draft.hotel.area}`, found: draft.hotel.catalogue_id },
      ...draft.days.flatMap((d) => d.items.map((i) => ({ asked_for: `${i.type} in ${i.area} on ${d.date}`, found: i.catalogue_id || "nothing found" }))),
    ];
    const bad = role.mode !== "none";
    const outcome = bad ? (rand() < 0.8 ? "rewritten" : "light edit") : rand() < 0.75 ? "sent unchanged" : "light edit";
    traces.push({
      trace_id: tid, request_id: r.request_id, request: r, lookups,
      draft: { hotel: draft.hotel, days: draft.days, total_eur_per_person: t },
      outcome, designer_minutes: outcome === "rewritten" ? int(70, 140) : outcome === "light edit" ? int(15, 35) : int(3, 8),
    });
    planted.push({ trace_id: tid, set: role.set, mode: role.mode, detail });
    if (!queue.length && redo.length) queue.push(...redo.splice(0));
  }
  traces.sort((a, b) => a.trace_id.localeCompare(b.trace_id));
  planted.sort((a, b) => a.trace_id.localeCompare(b.trace_id));
  return { cat, traces, planted, roles };
}

// ---------- labels, judges, releases and the A/B test ----------
function judgeSets(planted: { trace_id: string; set: string; mode: Mode }[]) {
  const judge = planted.filter((p) => p.set === "judge");
  const ordered = shuffle(judge.map((p) => p.trace_id));
  // train 20, dev 50, test 50. The golden set is the first 40 of dev.
  return { train: ordered.slice(0, 20), dev: ordered.slice(20, 70), test: ordered.slice(70, 120) };
}

function judgeVerdicts(truth: { id: string; pass: boolean }[], tprPassKeep: number, tnrFailCatch: number) {
  const passes = shuffle(truth.filter((t) => t.pass));
  const fails = shuffle(truth.filter((t) => !t.pass));
  const out = new Map<string, "pass" | "fail">();
  passes.forEach((t, i) => out.set(t.id, i < tprPassKeep ? "pass" : "fail"));
  fails.forEach((t, i) => out.set(t.id, i < tnrFailCatch ? "fail" : "pass"));
  return out;
}

function csv(rows: Record<string, unknown>[], cols?: string[]): string {
  const c = cols ?? Object.keys(rows[0] ?? {});
  const esc = (v: unknown) => { const s = v === undefined || v === null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [c.join(","), ...rows.map((r) => c.map((k) => esc(r[k])).join(","))].join("\n") + "\n";
}

export function writeWorld() {
  const { cat, traces, planted } = generate();
  rmSync(DATA, { recursive: true, force: true });
  for (const d of ["", "judges", "releases", "splits"]) mkdirSync(join(DATA, d), { recursive: true });
  const w = (p: string, s: string) => writeFileSync(join(DATA, p), s);

  w("catalogue.csv", csv(cat));
  const tt: Record<string, unknown>[] = [];
  for (const a of AREAS) for (const b of AREAS) tt.push({ from: a.id, to: b.id, car_minutes: carMinutes(a.id, b.id), train_minutes: trainMinutes(a.id, b.id) });
  w("travel-times.csv", csv(tt));
  w("requests.csv", csv(traces.map((t) => t.request)));
  w("traces.jsonl", traces.map((t) => JSON.stringify(t)).join("\n") + "\n");
  w("planted.csv", csv(planted));
  w("sample-30.csv", csv(planted.filter((p) => p.set === "sample").map((p) => ({ trace_id: p.trace_id }))));

  // Ines labels every trace in the judge set on one mode: does the draft respect the traveller's mobility?
  const judgeSet = planted.filter((p) => p.set === "judge");
  const tById = Object.fromEntries(traces.map((t) => [t.trace_id, t]));
  const critique = (p: (typeof planted)[number]) => {
    const t = tById[p.trace_id];
    if (p.mode === "ignores-mobility") return `Fail. ${p.detail}`;
    if (t.request.mobility === "none") return "Pass. No mobility need in the request.";
    const some = t.draft.days.flatMap((d) => d.items).find((i) => i.access === "some steps");
    if (t.request.mobility === "limited walking" && some) return `Pass. ${some.name} has a few steps, which is fine for limited walking.`;
    return `Pass. Every stop is step-free for a ${t.request.mobility === "wheelchair" ? "wheelchair user" : "slow walker"}.`;
  };
  const labels = judgeSet.map((p) => ({ trace_id: p.trace_id, mode: "ignores-mobility", label: p.mode === "ignores-mobility" ? "fail" : "pass", critique: critique(p) }));
  w("expert-labels.csv", csv(labels));

  const sets = judgeSets(planted);
  w("splits/train.csv", csv(sets.train.map((id) => ({ trace_id: id }))));
  w("splits/dev.csv", csv(sets.dev.map((id) => ({ trace_id: id }))));
  w("splits/test.csv", csv(sets.test.map((id) => ({ trace_id: id }))));
  w("golden-set.csv", csv(sets.dev.slice(0, 40).map((id) => ({ trace_id: id }))));

  const truth = labels.map((l) => ({ id: l.trace_id, pass: l.label === "pass" }));
  // 90 pass and 30 fail. Mobility judge: TPR 84/90, TNR 26/30. Generic judge: TPR 87/90, TNR 11/30.
  const mob = judgeVerdicts(truth, 84, 26);
  const gen = judgeVerdicts(truth, 87, 11);
  w("judges/judge-mobility-pass-fail.csv", csv(labels.map((l) => ({ trace_id: l.trace_id, critique: mob.get(l.trace_id) === "fail" ? "A stop on this trip is not step-free for this traveller." : "Every stop suits the traveller's mobility.", verdict: mob.get(l.trace_id) }))));
  w("judges/judge-generic-pass-fail.csv", csv(labels.map((l) => ({ trace_id: l.trace_id, critique: gen.get(l.trace_id) === "fail" ? "This itinerary has problems." : "This is a good itinerary.", verdict: gen.get(l.trace_id) }))));
  w("judges/judge-score-1-to-5.csv", csv(labels.map((l) => ({ trace_id: l.trace_id, critique: "Overall quality of the itinerary.", score: l.label === "pass" ? pick([4, 4, 5, 5, 5, 3]) : pick([2, 3, 3, 4, 4, 5]) }))));

  // Two releases run on the same 150 held-out requests. 26 of them need step-free access.
  const rel = (fails: Record<string, number>) => {
    const rows: Record<string, unknown>[] = [];
    const list: string[] = [];
    for (const [m, c] of Object.entries(fails)) for (let k = 0; k < c; k++) list.push(m);
    const mobFails = list.filter((m) => m === "ignores-mobility").length;
    const others = shuffle(list.filter((m) => m !== "ignores-mobility"));
    const firstOther = 150 - others.length + 1;
    for (let i = 1; i <= 150; i++) {
      const stepFree = i <= 26;
      const mode = stepFree && i <= mobFails ? "ignores-mobility" : i >= firstOther ? others[i - firstOther] : "";
      rows.push({ request_id: `E${pad(i)}`, needs_step_free: stepFree ? "yes" : "no", result: mode ? "fail" : "pass", failed_mode: mode });
    }
    return rows;
  };
  const live = rel({ "closed-on-the-day": 6, "over-budget": 5, "impossible-transfer": 4, "wrong-pace": 3, "diet-missed": 1, "ignores-mobility": 1, "not-in-catalogue": 1 });
  const cheap = rel({ "ignores-mobility": 7, "closed-on-the-day": 3, "over-budget": 3, "impossible-transfer": 2, "wrong-pace": 2, "diet-missed": 1 });
  w("releases/live.csv", csv(live));
  w("releases/cheaper-model.csv", csv(cheap));
  const summ = (name: string, rows: Record<string, unknown>[], cost: number) => {
    const out: Record<string, unknown> = { release: name, drafts: rows.length, passed: rows.filter((r) => r.result === "pass").length };
    out.pass_rate = ((out.passed as number) / rows.length).toFixed(2);
    out.cost_eur_per_draft = cost.toFixed(3);
    for (const m of MODES) out[m] = rows.filter((r) => r.failed_mode === m).length;
    out.step_free_requests = rows.filter((r) => r.needs_step_free === "yes").length;
    return out;
  };
  w("releases/summary.csv", csv([summ("live", live, 0.042), summ("cheaper-model", cheap, 0.014)]));

  // Instant drafts A/B test: 1,200 sessions an arm. Lift lives only in Lisbon weekends.
  const ab: Record<string, unknown>[] = [];
  const cell = (arm: string, trip: string, n: number, booked: number, refunds: number, closed: number) =>
    Array.from({ length: n }, (_, i) => ({
      arm, trip_type: trip, booked: i < booked ? 1 : 0, refund_request: i < refunds ? 1 : 0,
      refund_reason: i < closed ? "closed on arrival" : i < refunds ? "changed plans" : "",
    }));
  ab.push(...cell("designer", "lisbon weekend", 400, 68, 2, 0), ...cell("designer", "porto weekend", 400, 76, 2, 1), ...cell("designer", "other city break", 400, 72, 2, 1));
  ab.push(...cell("instant", "lisbon weekend", 400, 92, 8, 6), ...cell("instant", "porto weekend", 400, 74, 6, 4), ...cell("instant", "other city break", 400, 74, 5, 4));
  const shuffled = shuffle(ab).map((r, i) => ({ session_id: `S${pad(i + 1, 4)}`, ...r }));
  w("ab-test.csv", csv(shuffled));

  // One file the viewer loads with a double-click (no server needed).
  writeFileSync(join(DATA, "viewer-data.js"), `// Written by world/generate.ts. Do not edit; run: bun run world reset\nwindow.LANTERN = ${JSON.stringify({
    traces, sample: planted.filter((p) => p.set === "sample").map((p) => p.trace_id), golden: sets.dev.slice(0, 40),
  })};\n`);
  return { cat, traces, planted };
}

if (import.meta.main) {
  const { cat, traces } = writeWorld();
  console.log(`Wrote ${traces.length} traces and ${cat.length} catalogue items to world/data.`);
}
