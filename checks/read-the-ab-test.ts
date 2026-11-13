import type { Rule } from "../scripts/verify";
import { hasFile, safely, simplified, textIn } from "./lib/files";
import { dataCsv } from "./lib/world";
import { sameLineAfter } from "./set-launch-criteria";

// The guardrail the step states: closed-on-arrival refunds stay at or below 0.5% of sessions.
const GUARDRAIL_PERCENT = 0.5;
const TOLERANCE_POINTS = 0.5;
const DECISIONS = ["ship to all", "ship to a segment", "keep testing", "do not ship"];

type Truth = {
  designerPercent: number;
  instantPercent: number;
  differencePoints: number;
  lowPoints: number;
  highPoints: number;
  guardrailBreached: boolean;
};

const memoIn = (folder: string) => textIn(folder, "ab-decision.md");

function percentOf(
  rows: Record<string, string>[],
  isCounted: (row: Record<string, string>) => boolean,
) {
  return (rows.filter(isCounted).length / rows.length) * 100;
}

// Booking rates, the difference and its 95% interval, all in percent points.
function abTestTruth(): Truth {
  const sessions = dataCsv("ab-test.csv");
  const designer = sessions.filter((row) => row.arm === "designer");
  const instant = sessions.filter((row) => row.arm === "instant");
  const booked = (row: Record<string, string>) => row.booked === "1";
  const closedOnArrival = (row: Record<string, string>) =>
    row.refund_reason === "closed on arrival";
  const designerPercent = percentOf(designer, booked);
  const instantPercent = percentOf(instant, booked);
  const designerVariance = (designerPercent * (100 - designerPercent)) / designer.length;
  const instantVariance = (instantPercent * (100 - instantPercent)) / instant.length;
  const margin = 1.96 * Math.sqrt(designerVariance + instantVariance);
  const differencePoints = instantPercent - designerPercent;
  return {
    designerPercent,
    instantPercent,
    differencePoints,
    lowPoints: differencePoints - margin,
    highPoints: differencePoints + margin,
    guardrailBreached: percentOf(instant, closedOnArrival) > GUARDRAIL_PERCENT,
  };
}

// Reads 18%, 18.0 points or 0.18 as 18 points. A plain number under 1 is a share.
function asPoints(text: string): number {
  const value = Number.parseFloat(text);
  const hasUnit = /%|point/i.test(text);
  if (!hasUnit && Math.abs(value) < 1) return value * 100;
  return value;
}

function pointsAfter(folder: string, label: string): number[] {
  const text = sameLineAfter(memoIn(folder), label);
  const pieces = text.match(/-?\d+(\.\d+)?\s*(%|points?)?/gi) ?? [];
  return pieces.map(asPoints);
}

const near = (stated: number | undefined, truth: number) =>
  stated !== undefined && Math.abs(stated - truth) <= TOLERANCE_POINTS;

function intervalIsRight(folder: string): boolean {
  const truth = abTestTruth();
  const [low, high] = pointsAfter(folder, "95% interval");
  return near(low, truth.lowPoints) && near(high, truth.highPoints);
}

const crossesZero = () => abTestTruth().lowPoints < 0 && abTestTruth().highPoints > 0;
const saysYes = (text: string) => /^yes\b/.test(simplified(text));

function guardrailIsRight(folder: string): boolean {
  const stated = simplified(sameLineAfter(memoIn(folder), "Refund guardrail"));
  const saysBreached = /breach|broken|failed/.test(stated);
  const saysHeld = /held|met|passed|safe/.test(stated);
  if (abTestTruth().guardrailBreached) return saysBreached && !saysHeld;
  return saysHeld && !saysBreached;
}

function statedDecision(folder: string): string {
  const decision = simplified(sameLineAfter(memoIn(folder), "Decision"));
  return DECISIONS.find((choice) => decision.startsWith(choice)) ?? "";
}

function decisionFollowsTheData(folder: string): boolean {
  const decision = statedDecision(folder);
  if (decision === "") return false;
  const unsafeToShip = crossesZero() || abTestTruth().guardrailBreached;
  return !(decision === "ship to all" && unsafeToShip);
}

export default [
  {
    says: "ab-decision.md states each arm's booking rate within 0.5 points",
    test: (folder) =>
      safely(() => {
        if (!hasFile(folder, "ab-decision.md")) return false;
        const truth = abTestTruth();
        const [designer] = pointsAfter(folder, "Designer booking rate");
        const [instant] = pointsAfter(folder, "Instant booking rate");
        return near(designer, truth.designerPercent) && near(instant, truth.instantPercent);
      }),
    tryNext: "for each arm, divide the sessions with booked = 1 by all sessions in that arm",
  },
  {
    says: "the Difference: is within 0.5 points",
    test: (folder) =>
      safely(() => near(pointsAfter(folder, "Difference")[0], abTestTruth().differencePoints)),
    tryNext: "subtract the designer rate from the instant rate, in percent points",
  },
  {
    says: "the 95% interval: low and high ends are each within 0.5 points",
    test: (folder) => safely(() => intervalIsRight(folder)),
    tryNext:
      "the margin is 1.96 x the square root of p1(1-p1)/n1 + p2(1-p2)/n2; " +
      "write it like 95% interval: -1.1 to 5.1 points",
  },
  {
    says: "Crosses zero: says yes or no, and it is right",
    test: (folder) =>
      safely(() => {
        const stated = sameLineAfter(memoIn(folder), "Crosses zero");
        const answered = /^(yes|no)\b/.test(simplified(stated));
        return answered && saysYes(stated) === crossesZero();
      }),
    tryNext: "if the low end is below 0 and the high end above 0, the interval crosses zero",
  },
  {
    says: "the Refund guardrail: says breached or held, and it is right",
    test: (folder) => safely(() => guardrailIsRight(folder)),
    tryNext:
      "count closed on arrival refunds in the instant arm, divide by its sessions, " +
      "and compare with 0.5%",
  },
  {
    says: "the Decision: is one of the four choices, and never ship to all on a shaky result",
    test: (folder) => safely(() => decisionFollowsTheData(folder)),
    tryNext:
      "pick ship to all, ship to a segment, keep testing, or do not ship; " +
      "ship to all needs an interval above zero and a guardrail that held",
  },
] satisfies Rule[];
