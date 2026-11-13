// Turns a trace into the plain text a designer would read. Used by the Draft Planner and the
// replay file.
import type { Trace } from "./generate";

function childrenText(childrenAges: string): string {
  if (!childrenAges) return "";
  return `, children aged ${childrenAges}`;
}

export function requestText(trace: Trace): string {
  const request = trace.request;
  const adults = request.adults > 1 ? "adults" : "adult";
  const trip =
    `Request ${request.request_id}: ${request.trip_type}, ${request.nights} nights ` +
    `in the ${request.region} region from ${request.start_date}.`;
  const party =
    `Party: ${request.adults} ${adults}${childrenText(request.children_ages)}. ` +
    `Mobility: ${request.mobility}. Diet: ${request.diet}.`;
  const tastes =
    `Pace: ${request.pace}. Likes: ${request.interests}. ` +
    `Budget: ${request.budget_eur_per_person} euros a person.`;
  return [trip, party, tastes].join("\n");
}

export function draftText(trace: Trace): string {
  const draft = trace.draft;
  const lines = [`Hotel: ${draft.hotel.name} (${draft.hotel.price_eur} euros a person a night)`];
  for (const day of draft.days) {
    lines.push(`${day.weekday} ${day.date}`);
    for (const item of day.items) {
      lines.push(`  ${item.time}  ${item.name}  ${item.price_eur} euros`);
    }
  }
  lines.push(`Total: ${draft.total_eur_per_person} euros a person`);
  return lines.join("\n");
}
