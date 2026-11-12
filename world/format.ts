// Turns a trace into the plain text a designer would read. Used by the Draft Planner and the replay file.
import type { Trace } from "./generate";

const KIDS = (a: string) => (a ? `, children aged ${a}` : "");
export function requestText(t: Trace): string {
  const r = t.request;
  return [
    `Request ${r.request_id}: ${r.trip_type}, ${r.nights} nights in the ${r.region} region from ${r.start_date}.`,
    `Party: ${r.adults} adult${r.adults > 1 ? "s" : ""}${KIDS(r.children_ages)}. Mobility: ${r.mobility}. Diet: ${r.diet}.`,
    `Pace: ${r.pace}. Likes: ${r.interests}. Budget: ${r.budget_eur_per_person} euros a person.`,
  ].join("\n");
}
export function draftText(t: Trace): string {
  const lines = [
    `Hotel: ${t.draft.hotel.name} (${t.draft.hotel.price_eur} euros a person a night)`,
  ];
  for (const d of t.draft.days) {
    lines.push(`${d.weekday} ${d.date}`);
    for (const i of d.items) lines.push(`  ${i.time}  ${i.name}  ${i.price_eur} euros`);
  }
  lines.push(`Total: ${t.draft.total_eur_per_person} euros a person`);
  return lines.join("\n");
}
