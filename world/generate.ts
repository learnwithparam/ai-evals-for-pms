// Builds the Lantern Trails world from a fixed seed. The same seed always writes the same files,
// so `bun run world reset` puts every file back exactly as it shipped.
// The generator writes the answer key (planted.csv). No label in this world comes from a model.
//
// Every random choice comes from one seeded sequence, in a fixed order. Adding, removing or
// moving a single random call changes every file the generator writes.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { findFaults } from "./rules";

export const SEED = 2027;
export const DATA = join(import.meta.dir, "data");

// ---------- random numbers that repeat ----------

// A small seeded random number generator (mulberry32). The same seed gives the same numbers.
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

let nextRandom = seededRandom(SEED);

// A number from 0 up to, but not including, 1.
function randomFraction(): number {
  return nextRandom();
}

// A whole number from lowest to highest, both included.
function randomBetween(lowest: number, highest: number): number {
  return lowest + Math.floor(randomFraction() * (highest - lowest + 1));
}

// A choice that appears twice in the list is twice as likely to be picked.
function pickOne<Choice>(choices: readonly Choice[]): Choice {
  return choices[Math.floor(randomFraction() * choices.length)];
}

// A shuffled copy of the list. The original list stays as it is.
function shuffled<Entry>(list: readonly Entry[]): Entry[] {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(randomFraction() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// 7 becomes "007", so ids sort in the right order as text.
function zeroPadded(value: number, width = 3): string {
  return String(value).padStart(width, "0");
}

// ---------- places ----------
export type Area = {
  id: string;
  name: string;
  region: "lisbon" | "porto" | "algarve";
  x: number;
  y: number;
  water: boolean;
};
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
const areaById = Object.fromEntries(AREAS.map((area) => [area.id, area]));

// Roads wind, so a road is 25% longer than the straight line on the map.
// Cars average 80 km an hour, and every trip adds 15 minutes to park and walk.
export function carMinutes(fromAreaId: string, toAreaId: string): number {
  if (fromAreaId === toAreaId) return 15;
  const start = areaById[fromAreaId];
  const end = areaById[toAreaId];
  const roadKilometres = Math.hypot(start.x - end.x, start.y - end.y) * 1.25;
  return Math.round((roadKilometres / 80) * 60 + 15);
}

// Two inland towns in different regions have no train between them. An empty cell means no train.
export function trainMinutes(fromAreaId: string, toAreaId: string): number | "" {
  if (fromAreaId === toAreaId) return "";
  const start = areaById[fromAreaId];
  const end = areaById[toAreaId];
  if (!start.water && !end.water && start.region !== end.region) return "";
  return Math.round(carMinutes(fromAreaId, toAreaId) * 1.15 + 10);
}

// ---------- the supplier catalogue ----------
export type Item = {
  id: string;
  name: string;
  area: string;
  type: string;
  closed_day: string;
  opens: string;
  closes: string;
  season: string;
  price_eur: number;
  access: "step-free" | "some steps" | "steep steps";
  child_friendly: "yes" | "no";
  food: string;
  vegetarian_ok: "yes" | "no" | "";
  vegan_ok: "yes" | "no" | "";
  min_notice_days: number;
};

// What makes one catalogue entry. Fields left out take the most common value.
type EntryDetails = {
  name: string;
  type: string;
  opens: string;
  closes: string;
  price: number;
  access: Item["access"];
  noticeDays: number;
  closedDay?: string;
  season?: string;
  childFriendly?: Item["child_friendly"];
  food?: string;
  vegetarianOk?: Item["vegetarian_ok"];
  veganOk?: Item["vegan_ok"];
};

const STEEP_WALK = "Hilltop Lanes Walk";
const GENTLE_WALK = "Riverside Stroll";
const OTHER_WALKS = ["Old Quarter Walk", "Viewpoints Walk", "Market Walk", "Garden Walk"];
const MUSEUMS = [
  "Tile and Craft Museum",
  "Sea Stories Museum",
  "Old Trams Museum",
  "Town History House",
  "Cork Workshop Museum",
];
const TASTINGS = [
  "Cellar Tasting",
  "Cheese and Bread Tasting",
  "Sardine Tin Tasting",
  "Olive Oil Tasting",
  "Pastry Class",
];
const BOATS = ["River Boat Trip", "Sunset Sail", "Dolphin Boat Trip", "Coast Kayak Trip"];
const ACTIVITIES = [
  "Tile Painting Class",
  "Bike Ride",
  "Cooking Class",
  "Tram Ride",
  "Beach Afternoon",
  "Vineyard Visit",
];
const RESTAURANT_KINDS = ["Tasca", "Grill", "Bistro", "Canteen"];
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Repeated entries make that choice more likely.
const EXTRA_PLACE_TYPES = [
  "walk",
  "tasting",
  "tasting",
  "restaurant",
  "restaurant",
  "activity",
  "activity",
  "museum",
];
const ACCESS_CHOICES: Item["access"][] = ["step-free", "step-free", "some steps", "steep steps"];
const RESTAURANT_FOOD = ["meat and fish", "seafood only", "mixed menu", "mixed menu"];
const TASTING_FOOD = ["wine and cheese", "seafood", "pastries"];

function catalogueEntry(area: Area, details: EntryDetails): Omit<Item, "id"> {
  return {
    name: details.name,
    area: area.id,
    type: details.type,
    closed_day: details.closedDay ?? "",
    opens: details.opens,
    closes: details.closes,
    season: details.season ?? "all year",
    price_eur: details.price,
    access: details.access,
    child_friendly: details.childFriendly ?? "yes",
    food: details.food ?? "",
    vegetarian_ok: details.vegetarianOk ?? "",
    vegan_ok: details.veganOk ?? "",
    min_notice_days: details.noticeDays,
  };
}

function addToCatalogue(items: Item[], area: Area, details: EntryDetails): void {
  const id = `C${zeroPadded(items.length + 1)}`;
  items.push({ id, ...catalogueEntry(area, details) });
}

// The planted faults need these in every area: a steep walk and a gentle one, a museum shut on
// Mondays and one open every day, a seafood-only kitchen, a vegetarian-friendly one, and a hotel.
function entriesEveryAreaHas(area: Area, place: string): EntryDetails[] {
  const entries = [...walks(place), ...museums(place), ...restaurants(place), hotel(place)];
  if (area.water) entries.push(boatTrip(place));
  return entries;
}

function walks(place: string): EntryDetails[] {
  const steepWalk: EntryDetails = {
    name: `${place} ${STEEP_WALK}`,
    type: "walk",
    opens: "09:00",
    closes: "18:00",
    price: randomBetween(25, 40),
    access: "steep steps",
    noticeDays: 1,
  };
  const gentleWalk: EntryDetails = {
    name: `${place} ${GENTLE_WALK}`,
    type: "walk",
    opens: "09:00",
    closes: "18:00",
    price: randomBetween(20, 35),
    access: "step-free",
    noticeDays: 1,
  };
  return [steepWalk, gentleWalk];
}

function museums(place: string): EntryDetails[] {
  const shutOnMondays: EntryDetails = {
    name: `${place} ${pickOne(MUSEUMS)}`,
    type: "museum",
    closedDay: "Monday",
    opens: "10:00",
    closes: "18:00",
    price: randomBetween(8, 16),
    access: "step-free",
    noticeDays: 0,
  };
  const openEveryDay: EntryDetails = {
    name: `${place} Art House`,
    type: "museum",
    opens: "10:00",
    closes: "19:00",
    price: randomBetween(8, 14),
    access: "step-free",
    noticeDays: 0,
  };
  return [shutOnMondays, openEveryDay];
}

function restaurants(place: string): EntryDetails[] {
  const seafoodOnly: EntryDetails = {
    name: `${place} Kitchen No. ${randomBetween(1, 9)}`,
    type: "restaurant",
    closedDay: "Sunday",
    opens: "12:00",
    closes: "23:00",
    price: randomBetween(30, 55),
    access: "some steps",
    food: "seafood only",
    vegetarianOk: "no",
    veganOk: "no",
    noticeDays: 0,
  };
  const vegetarianFriendly: EntryDetails = {
    name: `${place} Green Table`,
    type: "restaurant",
    opens: "12:00",
    closes: "23:00",
    price: randomBetween(25, 45),
    access: "step-free",
    food: "vegetarian and vegan dishes",
    vegetarianOk: "yes",
    veganOk: "yes",
    noticeDays: 0,
  };
  return [seafoodOnly, vegetarianFriendly];
}

function hotel(place: string): EntryDetails {
  return {
    name: `${place} Courtyard Hotel`,
    type: "hotel",
    opens: "",
    closes: "",
    price: randomBetween(70, 140),
    access: "step-free",
    noticeDays: 2,
  };
}

function boatTrip(place: string): EntryDetails {
  return {
    name: `${place} ${pickOne(BOATS)}`,
    type: "boat",
    opens: "10:00",
    closes: "19:00",
    season: "April to October",
    price: randomBetween(25, 60),
    access: "some steps",
    noticeDays: 2,
  };
}

function extraPlaceName(type: string, place: string): string {
  switch (type) {
    case "walk":
      return `${place} ${pickOne(OTHER_WALKS)}`;
    case "tasting":
      return `${place} ${pickOne(TASTINGS)}`;
    case "restaurant": {
      const kind = pickOne(RESTAURANT_KINDS);
      return `${place} ${kind} No. ${randomBetween(1, 9)}`;
    }
    case "museum":
      return `${place} ${pickOne(MUSEUMS)}`;
    default:
      return `${place} ${pickOne(ACTIVITIES)}`;
  }
}

function extraPlaceFood(type: string): string {
  if (type === "restaurant") return pickOne(RESTAURANT_FOOD);
  if (type === "tasting") return pickOne(TASTING_FOOD);
  return "";
}

function extraPlaceClosedDay(type: string): string {
  if (type === "museum") return "Monday";
  if (type === "restaurant") return pickOne(["", "", "Monday", "Sunday"]);
  return "";
}

function extraPlacePrice(type: string): number {
  if (type === "museum") return randomBetween(8, 16);
  if (type === "restaurant") return randomBetween(25, 55);
  return randomBetween(20, 65);
}

// Places with no food leave the diet columns empty.
function vegetarianAnswer(food: string): Item["vegetarian_ok"] {
  if (food === "") return "";
  if (food === "seafood only" || food === "seafood") return "no";
  return "yes";
}

// Only some vegetarian-friendly places also suit vegans.
function veganAnswer(vegetarianOk: Item["vegetarian_ok"]): Item["vegan_ok"] {
  if (vegetarianOk === "") return "";
  if (vegetarianOk === "no") return "no";
  return randomFraction() < 0.4 ? "yes" : "no";
}

function extraPlace(type: string, name: string, food: string): EntryDetails {
  const closedDay = extraPlaceClosedDay(type);
  const price = extraPlacePrice(type);
  const access = pickOne(ACCESS_CHOICES);
  const vegetarianOk = vegetarianAnswer(food);
  const veganOk = veganAnswer(vegetarianOk);
  const isRestaurant = type === "restaurant";
  const isBeach = type === "activity" && name.includes("Beach");
  const isWineTasting = type === "tasting" && food === "wine and cheese";
  return {
    name,
    type,
    closedDay,
    opens: isRestaurant ? "12:00" : "09:30",
    closes: isRestaurant ? "23:00" : "18:30",
    season: isBeach ? "April to October" : "all year",
    price,
    access,
    childFriendly: isWineTasting ? "no" : "yes",
    food,
    vegetarianOk,
    veganOk,
    noticeDays: randomBetween(0, 3),
  };
}

// Tops the area up with random places until it holds its share of the catalogue.
function fillArea(items: Item[], area: Area, place: string): void {
  const placesPerArea = area.region === "algarve" ? 15 : 16;
  const placesInArea = () => items.filter((item) => item.area === area.id).length;
  while (placesInArea() < placesPerArea) {
    const type = pickOne(EXTRA_PLACE_TYPES);
    const name = extraPlaceName(type, place);
    // Two places with the same name would confuse the reader, so draw again.
    if (items.some((item) => item.name === name)) continue;
    const food = extraPlaceFood(type);
    addToCatalogue(items, area, extraPlace(type, name, food));
  }
}

function makeCatalogue(): Item[] {
  const items: Item[] = [];
  for (const area of AREAS) {
    // "Lisbon Alfama" becomes "Alfama", so place names stay short.
    const place = area.name.replace(/^(Lisbon|Porto|Algarve|Douro) /, "");
    for (const details of entriesEveryAreaHas(area, place)) {
      addToCatalogue(items, area, details);
    }
    fillArea(items, area, place);
  }
  // The course promises exactly 220 catalogue items.
  return items.slice(0, 220);
}

// ---------- requests, drafts and planted faults ----------
export const MODES = [
  "closed-on-the-day",
  "impossible-transfer",
  "ignores-mobility",
  "not-in-catalogue",
  "over-budget",
  "wrong-pace",
  "diet-missed",
  "out-of-season",
] as const;
export type Mode = (typeof MODES)[number] | "none";

type Request = {
  request_id: string;
  trip_type: "city break" | "custom tour";
  region: string;
  start_date: string;
  nights: number;
  adults: number;
  children_ages: string;
  mobility: "none" | "wheelchair" | "limited walking";
  diet: "none" | "vegetarian" | "vegan" | "no seafood";
  pace: "relaxed" | "balanced" | "full";
  interests: string;
  budget_eur_per_person: number;
};
type DraftItem = {
  time: string;
  catalogue_id: string;
  name: string;
  area: string;
  type: string;
  price_eur: number;
  access: string;
  closed_day: string;
  season: string;
  food: string;
  travel_min_from_last: number | "";
};
type Day = { date: string; weekday: string; items: DraftItem[] };
type Draft = { hotel: DraftItem; days: Day[] };
export type Trace = {
  trace_id: string;
  request_id: string;
  request: Request;
  lookups: { asked_for: string; found: string }[];
  draft: { hotel: DraftItem; days: Day[]; total_eur_per_person: number };
  outcome: string;
  designer_minutes: number;
};

// Noon UTC keeps the date the same in every time zone.
function dateFromText(date: string): Date {
  return new Date(`${date}T12:00:00Z`);
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: string, count: number): string {
  const moved = dateFromText(date);
  moved.setUTCDate(moved.getUTCDate() + count);
  return isoDate(moved);
}

function weekdayOf(date: string): string {
  return DAYS[dateFromText(date).getUTCDay()];
}

function monthName(date: string): string {
  return dateFromText(date).toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
}

// Winter runs from November to March.
function isWinter(date: string): boolean {
  const month = Number(date.slice(5, 7));
  return month <= 3 || month >= 11;
}

function inSeason(item: Item, date: string): boolean {
  return item.season === "all year" || !isWinter(date);
}

function isOpenOn(item: Item, date: string): boolean {
  return item.closed_day !== weekdayOf(date);
}

function suitsMobility(item: Item, mobility: Request["mobility"]): boolean {
  if (mobility === "wheelchair") return item.access === "step-free";
  if (mobility === "limited walking") return item.access !== "steep steps";
  return true;
}

// Places with no food suit every diet.
function suitsDiet(item: Item, diet: Request["diet"]): boolean {
  if (!item.food) return true;
  if (diet === "vegetarian") return item.vegetarian_ok === "yes";
  if (diet === "vegan") return item.vegan_ok === "yes";
  if (diet === "no seafood") return !/seafood/.test(item.food);
  return true;
}

function suitsChildren(item: Item, request: Request): boolean {
  return !request.children_ages || item.child_friendly !== "no";
}

// True when the place breaks none of the house rules for this traveller on this date.
function suitsTraveller(item: Item, request: Request, date: string): boolean {
  if (!isOpenOn(item, date) || !inSeason(item, date)) return false;
  if (!suitsMobility(item, request.mobility)) return false;
  if (!suitsDiet(item, request.diet)) return false;
  return suitsChildren(item, request);
}

// Like suitsTraveller, but skips one rule, so the place can break that rule and only that rule.
// The diet rule is not checked here. Without a date, the closing day and season are not checked.
function suitsTravellerExcept(
  item: Item,
  request: Request,
  skippedRule: "closed" | "access" | "season",
  date?: string,
): boolean {
  if (skippedRule !== "access" && !suitsMobility(item, request.mobility)) return false;
  if (date && skippedRule !== "season" && !inSeason(item, date)) return false;
  if (date && skippedRule !== "closed" && !isOpenOn(item, date)) return false;
  return suitsChildren(item, request);
}

function isActivity(item: { type: string }): boolean {
  return item.type !== "hotel" && item.type !== "restaurant";
}

const START_TIMES = ["09:30", "11:30", "14:30", "16:30", "17:45", "18:30"];
const DINNER_TIME = "19:30";

// The stop as it appears in a draft. The travel time is empty for the first stop of a trip.
function draftItemFrom(item: Item, time: string, previousArea: string | null): DraftItem {
  return {
    time,
    catalogue_id: item.id,
    name: item.name,
    area: item.area,
    type: item.type,
    price_eur: item.price_eur,
    access: item.access,
    closed_day: item.closed_day,
    season: item.season,
    food: item.food,
    travel_min_from_last: previousArea ? carMinutes(previousArea, item.area) : "",
  };
}

const REGION_AREAS: Record<string, string[]> = {
  lisbon: ["lisbon-baixa", "lisbon-alfama", "lisbon-belem", "sintra", "cascais", "obidos", "evora"],
  porto: ["porto-ribeira", "porto-foz", "douro-regua", "douro-pinhao"],
  algarve: ["algarve-lagos", "algarve-faro", "algarve-tavira"],
};
const REGION_CHOICES = ["lisbon", "lisbon", "porto", "porto", "algarve"];
const INTERESTS = ["food", "history", "views", "wine", "the sea", "art", "markets", "gardens"];

// Repeated entries make that choice more likely.
const MOBILITY_FAULT_NEEDS: Request["mobility"][] = ["wheelchair", "wheelchair", "limited walking"];
const MOBILITY_NEEDS: Request["mobility"][] = ["wheelchair", "limited walking"];
const DIET_FAULT_DIETS: Request["diet"][] = ["vegetarian", "vegetarian", "vegan"];
const DIETS: Request["diet"][] = ["none", "none", "none", "none", "vegetarian", "no seafood"];
const PACES: Request["pace"][] = ["relaxed", "balanced", "balanced", "full"];

// Every request draws a month and a day first, even when a fault replaces them, so the random
// sequence stays the same for every request.
function chooseStartDate(mode: Mode): string {
  const month = randomBetween(0, 11);
  const day = randomBetween(1, 26);
  let start = isoDate(new Date(Date.UTC(2027, month, day)));
  if (mode === "out-of-season") {
    // Seasonal places shut in winter, so the trip starts in January, February, March or November.
    const winterMonth = pickOne([0, 1, 2, 10]);
    const winterDay = randomBetween(1, 24);
    start = isoDate(new Date(Date.UTC(2027, winterMonth, winterDay)));
  }
  if (mode === "closed-on-the-day") {
    // Move the start so the second day is a Monday, when many museums are shut.
    while (weekdayOf(addDays(start, 1)) !== "Monday") start = addDays(start, 1);
  }
  return start;
}

// A wrong-pace fault needs a toddler on the trip, so a full day is clearly too much.
function chooseChildrenAges(mode: Mode): string {
  if (mode === "wrong-pace") return String(randomBetween(2, 4));
  if (randomFraction() < 0.2) {
    const younger = randomBetween(5, 9);
    const older = randomBetween(10, 15);
    return `${younger}, ${older}`;
  }
  return "";
}

function chooseMobility(mode: Mode): Request["mobility"] {
  if (mode === "ignores-mobility") return pickOne(MOBILITY_FAULT_NEEDS);
  if (randomFraction() < 0.12) return pickOne(MOBILITY_NEEDS);
  return "none";
}

function chooseDiet(mode: Mode): Request["diet"] {
  if (mode === "diet-missed") return pickOne(DIET_FAULT_DIETS);
  return pickOne(DIETS);
}

function choosePace(mode: Mode): Request["pace"] {
  if (mode === "wrong-pace") return "relaxed";
  return pickOne(PACES);
}

// The mobility is fixed in advance for the judge set, and drawn at random everywhere else.
function makeRequest(number: number, mode: Mode, mobility?: Request["mobility"]): Request {
  const region = pickOne(REGION_CHOICES);
  // A wrong-pace fault needs a tour of several days, so it is never a city break.
  const isCityBreak = randomFraction() < 0.45 && mode !== "wrong-pace";
  const nights = isCityBreak ? 2 : randomBetween(3, 4);
  const startDate = chooseStartDate(mode);
  const childrenAges = chooseChildrenAges(mode);
  const travellerMobility = mobility ?? chooseMobility(mode);
  const adults = randomBetween(1, 4);
  const diet = chooseDiet(mode);
  const pace = choosePace(mode);
  const interests = shuffled(INTERESTS).slice(0, 2).join(", ");
  return {
    request_id: `R${zeroPadded(number)}`,
    trip_type: isCityBreak ? "city break" : "custom tour",
    region,
    start_date: startDate,
    nights,
    adults,
    children_ages: childrenAges,
    mobility: travellerMobility,
    diet,
    pace,
    interests,
    budget_eur_per_person: 0, // Set later, once the draft's cost is known.
  };
}

// Everything the draft builder needs while it plans the days of one trip.
type DraftInputs = {
  request: Request;
  catalogue: Item[];
  areas: string[];
  hotelArea: string;
  stopsPerDay: number;
  borderline: boolean;
  usedIds: Set<string>;
};

const STOPS_PER_DAY = { relaxed: 2, balanced: 3, full: 4 };

// Lisbon trips sleep in the old centre and Porto trips by the river. Other regions pick any area.
function chooseHotelArea(areas: string[]): string {
  if (areas[0] === "lisbon-baixa") return pickOne(["lisbon-baixa", "lisbon-alfama"]);
  if (areas[0] === "porto-ribeira") return "porto-ribeira";
  return pickOne(areas);
}

// A clean draft: it breaks no house rule. A fault is planted into it afterwards.
function buildDraft(request: Request, catalogue: Item[], borderline: boolean): Draft {
  const areas = REGION_AREAS[request.region];
  const hotelArea = chooseHotelArea(areas);
  const isHotelHere = (item: Item) => item.area === hotelArea && item.type === "hotel";
  const hotelItem = mustFind(catalogue, isHotelHere, "a hotel");
  const inputs: DraftInputs = {
    request,
    catalogue,
    areas,
    hotelArea,
    stopsPerDay: STOPS_PER_DAY[request.pace],
    borderline,
    usedIds: new Set<string>(),
  };
  const days: Day[] = [];
  for (let dayIndex = 0; dayIndex < request.nights; dayIndex++) {
    days.push(planDay(inputs, dayIndex));
  }
  return { hotel: draftItemFrom(hotelItem, "", null), days };
}

function mustFind(items: Item[], test: (item: Item) => boolean, whatFor: string): Item {
  const found = items.find(test);
  if (!found) throw new Error(`No catalogue item fits ${whatFor}.`);
  return found;
}

function planDay(inputs: DraftInputs, dayIndex: number): Day {
  const date = addDays(inputs.request.start_date, dayIndex);
  // The first day stays near the hotel. Later days visit one of the region's first four areas.
  let area = inputs.hotelArea;
  if (dayIndex > 0) area = pickOne(inputs.areas.slice(0, 4));
  let activities = chooseActivities(inputs, area, date);
  if (inputs.borderline && dayIndex === 1) {
    activities = withSomeSteps(inputs, activities, area, date);
  }
  const dinner = chooseDinner(inputs, area, date);
  return { date, weekday: weekdayOf(date), items: dayItems(inputs, activities, dinner) };
}

function canBook(inputs: DraftInputs, item: Item, date: string): boolean {
  return !inputs.usedIds.has(item.id) && suitsTraveller(item, inputs.request, date);
}

function chooseActivities(inputs: DraftInputs, area: string, date: string): Item[] {
  const choices = inputs.catalogue.filter(
    (item) => item.area === area && isActivity(item) && canBook(inputs, item, date),
  );
  return shuffled(choices).slice(0, inputs.stopsPerDay);
}

// A borderline trace for limited walking includes a place with some steps.
// Ines passes it, so a good judge must learn that a few steps are fine.
function withSomeSteps(inputs: DraftInputs, activities: Item[], area: string, date: string) {
  const placeWithSteps = inputs.catalogue.find(
    (item) =>
      item.area === area &&
      item.access === "some steps" &&
      isActivity(item) &&
      canBook(inputs, item, date),
  );
  if (!placeWithSteps) return activities;
  const others = activities.filter((activity) => activity.id !== placeWithSteps.id);
  return [placeWithSteps, ...others].slice(0, inputs.stopsPerDay);
}

// Dinner is near the day's sights if a place fits, and otherwise back near the hotel.
function chooseDinner(inputs: DraftInputs, area: string, date: string): Item | undefined {
  const nearby = inputs.catalogue.filter(
    (item) => item.area === area && item.type === "restaurant" && canBook(inputs, item, date),
  );
  const nearbyDinner = shuffled(nearby)[0];
  if (nearbyDinner) return nearbyDinner;
  const nearHotel = inputs.catalogue.filter(
    (item) =>
      item.area === inputs.hotelArea &&
      item.type === "restaurant" &&
      suitsTraveller(item, inputs.request, date),
  );
  return shuffled(nearHotel)[0];
}

// Each day starts from the hotel. Every stop is marked used so no later day repeats it.
function dayItems(inputs: DraftInputs, activities: Item[], dinner?: Item): DraftItem[] {
  const items: DraftItem[] = [];
  let previousArea = inputs.hotelArea;
  for (const [index, activity] of activities.entries()) {
    items.push(draftItemFrom(activity, START_TIMES[index], previousArea));
    previousArea = activity.area;
    inputs.usedIds.add(activity.id);
  }
  if (dinner) {
    items.push(draftItemFrom(dinner, DINNER_TIME, previousArea));
    inputs.usedIds.add(dinner.id);
  }
  return items;
}

// The cost for one person: the hotel for every night, plus every stop.
function tripCost(hotelStay: DraftItem, days: Day[], nights: number): number {
  let stopsCost = 0;
  for (const day of days) {
    for (const item of day.items) stopsCost += item.price_eur;
  }
  return hotelStay.price_eur * nights + stopsCost;
}

// What a planter needs to change one day of a draft.
type Planting = { request: Request; draft: Draft; catalogue: Item[]; day: Day };

// Changes one thing in a clean draft so it shows exactly one failure mode.
// Returns a one-line detail.
// It throws when this draft cannot carry the fault, and the caller then draws a new request.
function plant(mode: Mode, request: Request, draft: Draft, catalogue: Item[]): string {
  const day = draft.days[Math.min(1, draft.days.length - 1)];
  const planting: Planting = { request, draft, catalogue, day };
  switch (mode) {
    case "closed-on-the-day":
      return plantClosedOnTheDay(planting);
    case "ignores-mobility":
      return plantIgnoresMobility(planting);
    case "out-of-season":
      return plantOutOfSeason(planting);
    case "diet-missed":
      return plantDietMissed(planting);
    case "not-in-catalogue":
      return plantNotInCatalogue(planting);
    case "impossible-transfer":
      return plantImpossibleTransfer(planting);
    case "wrong-pace":
      return plantWrongPace(planting);
    default:
      // A clean trace needs nothing. An over-budget fault comes from the budget, set later.
      return "";
  }
}

function isOnDay(day: Day, item: Item): boolean {
  return day.items.some((stop) => stop.catalogue_id === item.id);
}

function inRegion(request: Request, item: Item): boolean {
  return REGION_AREAS[request.region].includes(item.area);
}

// Swaps the day's first sight for a place that breaks one rule. A place in the same area comes
// first, so the travel times still look right.
function swapActivity(
  planting: Planting,
  breaksRule: (item: Item) => boolean,
  explain: (item: Item) => string,
): string {
  const { request, draft, catalogue, day } = planting;
  const index = Math.max(
    0,
    day.items.findIndex((stop) => stop.type !== "restaurant"),
  );
  const current = day.items[index];
  const area = current?.area ?? draft.hotel.area;
  const replacement =
    catalogue.find((item) => item.area === area && breaksRule(item) && !isOnDay(day, item)) ??
    mustFind(catalogue, (item) => inRegion(request, item) && breaksRule(item), "the fault");
  const newStop = draftItemFrom(replacement, current?.time ?? "11:30", null);
  day.items[index] = { ...newStop, travel_min_from_last: current?.travel_min_from_last ?? 15 };
  return explain(replacement);
}

function plantClosedOnTheDay(planting: Planting): string {
  const { request, day } = planting;
  return swapActivity(
    planting,
    (item) =>
      item.closed_day === day.weekday &&
      item.type === "museum" &&
      suitsTravellerExcept(item, request, "closed"),
    (item) =>
      `${item.name} is booked on a ${day.weekday}, but it is closed on ${item.closed_day}s.`,
  );
}

function plantIgnoresMobility(planting: Planting): string {
  const { request, day } = planting;
  const usesWheelchair = request.mobility === "wheelchair";
  const travellerNeed = usesWheelchair ? "uses a wheelchair" : "has limited walking";
  const isTooHard = (item: Item) => {
    if (usesWheelchair) return item.access !== "step-free";
    return item.access === "steep steps";
  };
  return swapActivity(
    planting,
    (item) =>
      isTooHard(item) &&
      isActivity(item) &&
      suitsTravellerExcept(item, request, "access", day.date),
    (item) => `${item.name} has ${item.access}, and the traveller ${travellerNeed}.`,
  );
}

function plantOutOfSeason(planting: Planting): string {
  const { request, day } = planting;
  return swapActivity(
    planting,
    (item) => item.season !== "all year" && suitsTravellerExcept(item, request, "season", day.date),
    (item) => `${item.name} runs ${item.season} only, and this trip is in ${monthName(day.date)}.`,
  );
}

function dinnerIndex(day: Day): number {
  const index = day.items.findIndex((stop) => stop.type === "restaurant");
  if (index === -1) throw new Error("This day has no dinner to change.");
  return index;
}

function plantDietMissed(planting: Planting): string {
  const { request, catalogue, day } = planting;
  const index = dinnerIndex(day);
  const dinner = day.items[index];
  const isOpenSeafoodOnly = (item: Item) =>
    item.food === "seafood only" && item.closed_day !== day.weekday;
  const seafoodPlace =
    catalogue.find(
      (item) => item.area === dinner.area && item.type === "restaurant" && isOpenSeafoodOnly(item),
    ) ?? mustFind(catalogue, (item) => inRegion(request, item) && isOpenSeafoodOnly(item), "diet");
  const newDinner = draftItemFrom(seafoodPlace, DINNER_TIME, null);
  day.items[index] = { ...newDinner, travel_min_from_last: dinner.travel_min_from_last };
  return `${seafoodPlace.name} serves seafood only, and the party is ${request.diet}.`;
}

const MADE_UP_RESTAURANTS = [
  "Seaview Garden Restaurant",
  "Old Mill Wine Bar",
  "Blue Door Fado House",
  "Fisherman's Rest Cafe",
  "Hidden Courtyard Tavern",
];

// Dinner at a place the supplier catalogue has never heard of, so it has no id and no details.
function plantNotInCatalogue(planting: Planting): string {
  const { day } = planting;
  const name = pickOne(MADE_UP_RESTAURANTS);
  const index = dinnerIndex(day);
  const dinner = day.items[index];
  day.items[index] = {
    time: DINNER_TIME,
    catalogue_id: "",
    name,
    area: dinner.area,
    type: "restaurant",
    price_eur: randomBetween(30, 50),
    access: "",
    closed_day: "",
    season: "",
    food: "",
    travel_min_from_last: dinner.travel_min_from_last,
  };
  return `${name} is not in the supplier catalogue, so nobody can book it.`;
}

// Puts a stop from another region in the middle of the day, hours away from the stops around it.
function plantImpossibleTransfer(planting: Planting): string {
  const { request, draft, catalogue, day } = planting;
  const farAreas = AREAS.filter((area) => area.region !== request.region);
  const farArea = pickOne(farAreas);
  const farPlace = mustFind(
    catalogue,
    (item) =>
      item.area === farArea.id && isActivity(item) && suitsTraveller(item, request, day.date),
    "a far transfer",
  );
  const index = Math.min(1, day.items.length - 1);
  if (index < 0) throw new Error("This day has no stops to change.");
  const previousArea = day.items[index - 1]?.area ?? draft.hotel.area;
  const farStop = draftItemFrom(farPlace, day.items[index].time, previousArea);
  day.items[index] = farStop;
  const nextStop = day.items[index + 1];
  if (nextStop) nextStop.travel_min_from_last = carMinutes(farPlace.area, nextStop.area);
  const minutes = farStop.travel_min_from_last;
  const gap = `${minutes} minutes by car from the stop before it`;
  return `${farPlace.name} is ${gap}, with no time to get there.`;
}

// Packs up to six sights into one day of a relaxed trip with a toddler.
function plantWrongPace(planting: Planting): string {
  const { request, draft, catalogue, day } = planting;
  const area = day.items[0]?.area ?? draft.hotel.area;
  const extraSights = catalogue.filter(
    (item) =>
      item.area === area &&
      isActivity(item) &&
      suitsTraveller(item, request, day.date) &&
      !isOnDay(day, item),
  );
  const dinners = day.items.filter((stop) => stop.type === "restaurant");
  const sights = day.items.filter((stop) => stop.type !== "restaurant");
  const addedSights = extraSights.slice(0, 4).map((item) => draftItemFrom(item, "", area));
  const packedSights = [...sights, ...addedSights].slice(0, 6);
  for (const [index, sight] of packedSights.entries()) sight.time = START_TIMES[index];
  const lateDinners = dinners.map((dinner) => ({ ...dinner, time: DINNER_TIME }));
  day.items = [...packedSights, ...lateDinners];
  const child = `a ${request.children_ages} year old`;
  return `${day.items.length} stops in one day for a relaxed trip with ${child}.`;
}

// ---------- the plan: which trace carries which fault ----------
// sample-30: what the learner reads first. judge-120: the set the three judges and Ines labelled.
// rest-150: everything else. Counts are fixed so the course's numbers never drift.
const PLAN = {
  sample: {
    "closed-on-the-day": 3,
    "ignores-mobility": 4,
    "over-budget": 2,
    "impossible-transfer": 2,
    "diet-missed": 2,
    none: 17,
  },
  judge: {
    "ignores-mobility": 30,
    "closed-on-the-day": 3,
    "over-budget": 2,
    "wrong-pace": 2,
    "not-in-catalogue": 1,
    "out-of-season": 1,
    "impossible-transfer": 1,
    none: 80,
  },
  rest: {
    "closed-on-the-day": 8,
    "impossible-transfer": 5,
    "over-budget": 6,
    "not-in-catalogue": 5,
    "wrong-pace": 5,
    "diet-missed": 4,
    "out-of-season": 4,
    "ignores-mobility": 3,
    none: 110,
  },
} as const;
const SET_NAMES = ["sample", "judge", "rest"] as const;
type SetName = (typeof SET_NAMES)[number];

// The job one trace does: the fault it carries and, in the judge set, the traveller's mobility.
type Job = { mode: Mode; mobility?: Request["mobility"]; borderline?: boolean };
type Role = Job & { number: number; set: SetName };
type Planted = { trace_id: string; set: string; mode: Mode; detail: string };

function jobsForSet(set: SetName): Job[] {
  const jobs: Job[] = [];
  for (const [mode, count] of Object.entries(PLAN[set])) {
    for (let i = 0; i < count; i++) jobs.push({ mode: mode as Mode });
  }
  if (set === "judge") giveJudgeSetMobility(jobs);
  return jobs;
}

// The judge set tests the mobility judge. Its 30 mobility faults are 20 wheelchair users and
// 10 people with limited walking. 15 clean traces also have a mobility need: 9 wheelchair users
// and 6 borderline trips for limited walking. Everyone else has no mobility need.
function giveJudgeSetMobility(jobs: Job[]): void {
  const faults = jobs.filter((job) => job.mode === "ignores-mobility");
  for (const [index, job] of faults.entries()) {
    job.mobility = index < 20 ? "wheelchair" : "limited walking";
  }
  const cleanWithNeed = jobs.filter((job) => job.mode === "none").slice(0, 15);
  for (const [index, job] of cleanWithNeed.entries()) {
    job.mobility = index < 9 ? "wheelchair" : "limited walking";
    job.borderline = index >= 9;
  }
  for (const job of jobs) job.mobility ??= "none";
}

// Trace numbers 1 to 300 are dealt out in a random order, so faults are spread across them.
function assignRoles(): Role[] {
  const allNumbers = Array.from({ length: 300 }, (_, i) => i + 1);
  const traceNumbers = shuffled(allNumbers);
  const roles: Role[] = [];
  for (const set of SET_NAMES) {
    for (const job of shuffled(jobsForSet(set))) {
      roles.push({ number: traceNumbers[roles.length], set, ...job });
    }
  }
  return roles.sort((first, second) => first.number - second.number);
}

// Every day needs at least two sights and a dinner, so a fault has something to change.
function isFullDraft(draft: Draft): boolean {
  return draft.days.every((day) => {
    const sights = day.items.filter((stop) => stop.type !== "restaurant");
    const hasDinner = day.items.some((stop) => stop.type === "restaurant");
    return sights.length >= 2 && hasDinner;
  });
}

// A borderline trace must include at least one stop with some steps.
function hasStepsIfNeeded(role: Role, draft: Draft): boolean {
  if (!role.borderline) return true;
  return draft.days.some((day) => day.items.some((stop) => stop.access === "some steps"));
}

function plantOrNothing(mode: Mode, request: Request, draft: Draft, catalogue: Item[]) {
  try {
    return plant(mode, request, draft, catalogue);
  } catch {
    return undefined;
  }
}

// One request and one draft with the role's fault planted. Returns nothing when the draft is not
// good enough, unless mustAccept is set: then only a fault that cannot be planted stops it.
function attemptDraft(role: Role, catalogue: Item[], mustAccept: boolean) {
  const request = makeRequest(role.number, role.mode, role.mobility);
  const draft = buildDraft(request, catalogue, Boolean(role.borderline));
  if (!isFullDraft(draft) && !mustAccept) return undefined;
  const detail = plantOrNothing(role.mode, request, draft, catalogue);
  if (detail === undefined && mustAccept) throw new Error(`could not plant ${role.mode}`);
  if (detail === undefined) return undefined;
  if (!hasStepsIfNeeded(role, draft) && !mustAccept) return undefined;
  return { request, draft, detail };
}

// Draws requests and drafts until one can carry the role's fault.
// After 50 tries it accepts a draft that is not ideal, but it never skips the fault.
function draftWithFault(role: Role, catalogue: Item[]) {
  for (let tries = 0; ; tries++) {
    const attempt = attemptDraft(role, catalogue, tries >= 50);
    if (attempt) return attempt;
  }
}

// An over-budget trace costs 18% more than its budget.
// Every other budget leaves 6% to 26% to spare, rounded to the nearest 10 euros.
function chooseBudget(mode: Mode, cost: number): number {
  if (mode === "over-budget") return Math.round(cost / 1.18);
  const spare = 1.06 + randomFraction() * 0.2;
  return Math.round((cost * spare) / 10) * 10;
}

function overBudgetDetail(cost: number, budget: number): string {
  const percentOver = Math.round((cost / budget - 1) * 100);
  return `The plan costs ${cost} euros a person, ${percentOver}% over the ${budget} euro budget.`;
}

// Checks the trace with the house rules. findFaults only reads the request and the draft.
function hasOnlyPlantedFault(
  mode: Mode,
  trace: Pick<Trace, "request" | "draft">,
  catalogueById: Map<string, Item>,
): boolean {
  const found = findFaults(trace as Trace, catalogueById);
  const wanted = mode === "none" ? [] : [mode];
  return found.join() === wanted.join();
}

// What the drafting assistant asked the catalogue for, and what came back.
function lookupsFor(draft: Draft): Trace["lookups"] {
  const hotelLookup = {
    asked_for: `hotel in ${draft.hotel.area}`,
    found: draft.hotel.catalogue_id,
  };
  const stopLookups = draft.days.flatMap((day) =>
    day.items.map((stop) => ({
      asked_for: `${stop.type} in ${stop.area} on ${day.date}`,
      found: stop.catalogue_id || "nothing found",
    })),
  );
  return [hotelLookup, ...stopLookups];
}

// Designers rewrite most faulty drafts and send most clean ones as they are.
function chooseOutcome(mode: Mode): string {
  const draw = randomFraction();
  if (mode !== "none") return draw < 0.8 ? "rewritten" : "light edit";
  return draw < 0.75 ? "sent unchanged" : "light edit";
}

function designerMinutes(outcome: string): number {
  if (outcome === "rewritten") return randomBetween(70, 140);
  if (outcome === "light edit") return randomBetween(15, 35);
  return randomBetween(3, 8);
}

// Returns nothing when the trace has a fault besides the planted one.
function tryToMakeTrace(role: Role, catalogue: Item[], catalogueById: Map<string, Item>) {
  const { request, draft, detail: plantedDetail } = draftWithFault(role, catalogue);
  const cost = tripCost(draft.hotel, draft.days, request.nights);
  request.budget_eur_per_person = chooseBudget(role.mode, cost);
  let detail = plantedDetail;
  if (role.mode === "over-budget") detail = overBudgetDetail(cost, request.budget_eur_per_person);
  const traceId = `T${zeroPadded(role.number)}`;
  const fullDraft = { hotel: draft.hotel, days: draft.days, total_eur_per_person: cost };
  const probe = { request, draft: fullDraft };
  if (!hasOnlyPlantedFault(role.mode, probe, catalogueById)) return undefined;
  const lookups = lookupsFor(draft);
  const outcome = chooseOutcome(role.mode);
  const trace: Trace = {
    trace_id: traceId,
    request_id: request.request_id,
    request,
    lookups,
    draft: fullDraft,
    outcome,
    designer_minutes: designerMinutes(outcome),
  };
  const planted: Planted = { trace_id: traceId, set: role.set, mode: role.mode, detail };
  return { trace, planted };
}

function makeTraceForRole(role: Role, catalogue: Item[], catalogueById: Map<string, Item>) {
  for (let failures = 0; failures <= 400; failures++) {
    const made = tryToMakeTrace(role, catalogue, catalogueById);
    if (made) return made;
  }
  throw new Error(`T${zeroPadded(role.number)}: could not plant ${role.mode} as its only fault`);
}

export function generate() {
  nextRandom = seededRandom(SEED);
  const catalogue = makeCatalogue();
  const roles = assignRoles();
  const catalogueById = new Map(catalogue.map((item) => [item.id, item]));
  const traces: Trace[] = [];
  const planted: Planted[] = [];
  for (const role of roles) {
    const made = makeTraceForRole(role, catalogue, catalogueById);
    traces.push(made.trace);
    planted.push(made.planted);
  }
  traces.sort((first, second) => first.trace_id.localeCompare(second.trace_id));
  planted.sort((first, second) => first.trace_id.localeCompare(second.trace_id));
  return { catalogue, traces, planted };
}

// ---------- labels, judges, releases and the A/B test ----------
type Row = Record<string, unknown>;
type Label = { trace_id: string; mode: string; label: "pass" | "fail"; critique: string };

// A cell is quoted only when it holds a comma, a quote or a line break.
function csvCell(value: unknown): string {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

// The first row's fields become the column names.
function csv(rows: Row[]): string {
  const columns = Object.keys(rows[0] ?? {});
  const lines = rows.map((row) => columns.map((column) => csvCell(row[column])).join(","));
  return `${[columns.join(","), ...lines].join("\n")}\n`;
}

function writeDataFile(path: string, text: string): void {
  writeFileSync(join(DATA, path), text);
}

function idRows(traceIds: string[]): Row[] {
  return traceIds.map((traceId) => ({ trace_id: traceId }));
}

function travelTimes(): Row[] {
  const rows: Row[] = [];
  for (const start of AREAS) {
    for (const end of AREAS) {
      rows.push({
        from: start.id,
        to: end.id,
        car_minutes: carMinutes(start.id, end.id),
        train_minutes: trainMinutes(start.id, end.id),
      });
    }
  }
  return rows;
}

function writeTraceFiles(catalogue: Item[], traces: Trace[], planted: Planted[]): void {
  writeDataFile("catalogue.csv", csv(catalogue));
  writeDataFile("travel-times.csv", csv(travelTimes()));
  writeDataFile("requests.csv", csv(traces.map((trace) => trace.request)));
  const traceLines = traces.map((trace) => JSON.stringify(trace));
  writeDataFile("traces.jsonl", `${traceLines.join("\n")}\n`);
  writeDataFile("planted.csv", csv(planted));
  const sample = planted.filter((row) => row.set === "sample");
  writeDataFile("sample-30.csv", csv(idRows(sample.map((row) => row.trace_id))));
}

// Ines's note on one trace, as she would write it in her labelling sheet.
function inesCritique(row: Planted, trace: Trace): string {
  if (row.mode === "ignores-mobility") return `Fail. ${row.detail}`;
  const mobility = trace.request.mobility;
  if (mobility === "none") return "Pass. No mobility need in the request.";
  const stops = trace.draft.days.flatMap((day) => day.items);
  const stopWithSteps = stops.find((stop) => stop.access === "some steps");
  if (mobility === "limited walking" && stopWithSteps) {
    return `Pass. ${stopWithSteps.name} has a few steps, which is fine for limited walking.`;
  }
  const traveller = mobility === "wheelchair" ? "wheelchair user" : "slow walker";
  return `Pass. Every stop is step-free for a ${traveller}.`;
}

// Ines labels every trace in the judge set on one mode:
// does the draft respect the traveller's mobility?
function writeExpertLabels(traces: Trace[], planted: Planted[]): Label[] {
  const traceById = Object.fromEntries(traces.map((trace) => [trace.trace_id, trace]));
  const judgeSet = planted.filter((row) => row.set === "judge");
  const labels: Label[] = judgeSet.map((row) => ({
    trace_id: row.trace_id,
    mode: "ignores-mobility",
    label: row.mode === "ignores-mobility" ? "fail" : "pass",
    critique: inesCritique(row, traceById[row.trace_id]),
  }));
  writeDataFile("expert-labels.csv", csv(labels));
  return labels;
}

// The judge set splits into train 20, dev 50 and test 50. The golden set is the first 40 of dev.
// Returns the golden set.
function writeSplits(planted: Planted[]): string[] {
  const judgeSet = planted.filter((row) => row.set === "judge");
  const ordered = shuffled(judgeSet.map((row) => row.trace_id));
  const dev = ordered.slice(20, 70);
  const golden = dev.slice(0, 40);
  writeDataFile("splits/train.csv", csv(idRows(ordered.slice(0, 20))));
  writeDataFile("splits/dev.csv", csv(idRows(dev)));
  writeDataFile("splits/test.csv", csv(idRows(ordered.slice(70, 120))));
  writeDataFile("golden-set.csv", csv(idRows(golden)));
  return golden;
}

type Verdict = "pass" | "fail";

// A judge with a known accuracy: it agrees with Ines on exactly passesKept of her passes and
// failsCaught of her fails. Which traces it gets wrong is random.
function judgeVerdicts(labels: Label[], passesKept: number, failsCaught: number) {
  const passes = shuffled(labels.filter((label) => label.label === "pass"));
  const fails = shuffled(labels.filter((label) => label.label === "fail"));
  const verdicts = new Map<string, Verdict>();
  for (const [index, label] of passes.entries()) {
    verdicts.set(label.trace_id, index < passesKept ? "pass" : "fail");
  }
  for (const [index, label] of fails.entries()) {
    verdicts.set(label.trace_id, index < failsCaught ? "fail" : "pass");
  }
  return verdicts;
}

type Critiques = Record<Verdict, string>;
const MOBILITY_CRITIQUES: Critiques = {
  pass: "Every stop suits the traveller's mobility.",
  fail: "A stop on this trip is not step-free for this traveller.",
};
const GENERIC_CRITIQUES: Critiques = {
  pass: "This is a good itinerary.",
  fail: "This itinerary has problems.",
};

function judgeRows(labels: Label[], verdicts: Map<string, Verdict>, critiques: Critiques): Row[] {
  return labels.map((label) => {
    const verdict = verdicts.get(label.trace_id);
    const critique = verdict === "fail" ? critiques.fail : critiques.pass;
    return { trace_id: label.trace_id, critique, verdict };
  });
}

// The 1-to-5 judge leans high on good traces and spreads out on bad ones, so a cut-off is unclear.
function scoreRows(labels: Label[]): Row[] {
  return labels.map((label) => {
    const scoresToPick = label.label === "pass" ? [4, 4, 5, 5, 5, 3] : [2, 3, 3, 4, 4, 5];
    return {
      trace_id: label.trace_id,
      critique: "Overall quality of the itinerary.",
      score: pickOne(scoresToPick),
    };
  });
}

// Ines passes 90 and fails 30. The mobility judge agrees on 84 passes and 26 fails.
// The generic judge agrees on 87 passes but catches only 11 fails.
function writeJudges(labels: Label[]): void {
  const mobilityVerdicts = judgeVerdicts(labels, 84, 26);
  const genericVerdicts = judgeVerdicts(labels, 87, 11);
  const mobilityRows = judgeRows(labels, mobilityVerdicts, MOBILITY_CRITIQUES);
  const genericRows = judgeRows(labels, genericVerdicts, GENERIC_CRITIQUES);
  writeDataFile("judges/judge-mobility-pass-fail.csv", csv(mobilityRows));
  writeDataFile("judges/judge-generic-pass-fail.csv", csv(genericRows));
  writeDataFile("judges/judge-score-1-to-5.csv", csv(scoreRows(labels)));
}

// Two releases run on the same 150 held-out requests. The first 26 of them need step-free access.
const RELEASE_REQUESTS = 150;
const STEP_FREE_REQUESTS = 26;
const LIVE_FAILURES = {
  "closed-on-the-day": 6,
  "over-budget": 5,
  "impossible-transfer": 4,
  "wrong-pace": 3,
  "diet-missed": 1,
  "ignores-mobility": 1,
  "not-in-catalogue": 1,
};
const CHEAPER_MODEL_FAILURES = {
  "ignores-mobility": 7,
  "closed-on-the-day": 3,
  "over-budget": 3,
  "impossible-transfer": 2,
  "wrong-pace": 2,
  "diet-missed": 1,
};

// Mobility failures land on the first step-free requests. Other failures land on the last requests.
function failedModeFor(requestNumber: number, mobilityFailures: number, otherFailures: string[]) {
  const needsStepFree = requestNumber <= STEP_FREE_REQUESTS;
  if (needsStepFree && requestNumber <= mobilityFailures) return "ignores-mobility";
  const firstOther = RELEASE_REQUESTS - otherFailures.length + 1;
  if (requestNumber >= firstOther) return otherFailures[requestNumber - firstOther];
  return "";
}

function releaseResults(failureCounts: Record<string, number>): Row[] {
  const failedModes = Object.entries(failureCounts).flatMap(([mode, count]) =>
    Array.from({ length: count }, () => mode),
  );
  const mobilityFailures = failedModes.filter((mode) => mode === "ignores-mobility").length;
  const otherFailures = shuffled(failedModes.filter((mode) => mode !== "ignores-mobility"));
  const rows: Row[] = [];
  for (let requestNumber = 1; requestNumber <= RELEASE_REQUESTS; requestNumber++) {
    const failedMode = failedModeFor(requestNumber, mobilityFailures, otherFailures);
    rows.push({
      request_id: `E${zeroPadded(requestNumber)}`,
      needs_step_free: requestNumber <= STEP_FREE_REQUESTS ? "yes" : "no",
      result: failedMode ? "fail" : "pass",
      failed_mode: failedMode,
    });
  }
  return rows;
}

function releaseSummary(release: string, rows: Row[], costPerDraft: number): Row {
  const passed = rows.filter((row) => row.result === "pass").length;
  const summary: Row = {
    release,
    drafts: rows.length,
    passed,
    pass_rate: (passed / rows.length).toFixed(2),
    cost_eur_per_draft: costPerDraft.toFixed(3),
  };
  for (const mode of MODES) summary[mode] = rows.filter((row) => row.failed_mode === mode).length;
  summary.step_free_requests = rows.filter((row) => row.needs_step_free === "yes").length;
  return summary;
}

function writeReleases(): void {
  const live = releaseResults(LIVE_FAILURES);
  const cheaper = releaseResults(CHEAPER_MODEL_FAILURES);
  writeDataFile("releases/live.csv", csv(live));
  writeDataFile("releases/cheaper-model.csv", csv(cheaper));
  const summaries = [
    releaseSummary("live", live, 0.042),
    releaseSummary("cheaper-model", cheaper, 0.014),
  ];
  writeDataFile("releases/summary.csv", csv(summaries));
}

// The instant drafts A/B test: 1,200 sessions an arm, 400 for each kind of trip.
// The lift in bookings lives only in Lisbon weekends, and "closed on arrival" refunds rise.
type AbCell = { arm: string; trip: string; booked: number; refunds: number; closed: number };
const SESSIONS_PER_CELL = 400;
const AB_CELLS: AbCell[] = [
  { arm: "designer", trip: "lisbon weekend", booked: 68, refunds: 2, closed: 0 },
  { arm: "designer", trip: "porto weekend", booked: 76, refunds: 2, closed: 1 },
  { arm: "designer", trip: "other city break", booked: 72, refunds: 2, closed: 1 },
  { arm: "instant", trip: "lisbon weekend", booked: 92, refunds: 8, closed: 6 },
  { arm: "instant", trip: "porto weekend", booked: 74, refunds: 6, closed: 4 },
  { arm: "instant", trip: "other city break", booked: 74, refunds: 5, closed: 4 },
];

function refundReason(sessionIndex: number, cell: AbCell): string {
  if (sessionIndex < cell.closed) return "closed on arrival";
  if (sessionIndex < cell.refunds) return "changed plans";
  return "";
}

function cellSessions(cell: AbCell): Row[] {
  return Array.from({ length: SESSIONS_PER_CELL }, (_, i) => ({
    arm: cell.arm,
    trip_type: cell.trip,
    booked: i < cell.booked ? 1 : 0,
    refund_request: i < cell.refunds ? 1 : 0,
    refund_reason: refundReason(i, cell),
  }));
}

function writeAbTest(): void {
  const sessions = AB_CELLS.flatMap(cellSessions);
  const numbered = shuffled(sessions).map((session, index) => ({
    session_id: `S${zeroPadded(index + 1, 4)}`,
    ...session,
  }));
  writeDataFile("ab-test.csv", csv(numbered));
}

// One file the viewer loads with a double-click, so no server is needed.
function writeViewerData(traces: Trace[], planted: Planted[], golden: string[]): void {
  const sample = planted.filter((row) => row.set === "sample").map((row) => row.trace_id);
  const viewerData = JSON.stringify({ traces, sample, golden }, null, 2);
  const header = "// Written by world/generate.ts. Do not edit; run: bun run world reset";
  writeDataFile("viewer-data.js", `${header}\nwindow.LANTERN = ${viewerData};\n`);
}

// The writers run in this order because each one takes its random numbers from the same sequence.
export function writeWorld() {
  const { catalogue, traces, planted } = generate();
  rmSync(DATA, { recursive: true, force: true });
  for (const folder of ["", "judges", "releases", "splits"]) {
    mkdirSync(join(DATA, folder), { recursive: true });
  }
  writeTraceFiles(catalogue, traces, planted);
  const labels = writeExpertLabels(traces, planted);
  const golden = writeSplits(planted);
  writeJudges(labels);
  writeReleases();
  writeAbTest();
  writeViewerData(traces, planted, golden);
  return { catalogue, traces, planted };
}

if (import.meta.main) {
  const { catalogue, traces } = writeWorld();
  console.log(
    `Wrote ${traces.length} traces and ${catalogue.length} catalogue items to world/data.`,
  );
}
