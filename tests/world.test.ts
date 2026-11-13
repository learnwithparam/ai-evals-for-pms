// Guards the world: it rebuilds byte for byte from its seed, and every planted number the course
// uses holds.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../world/generate";
import { findFaults } from "../world/rules";
import { catalogue, DATA, dataCsv, planted, traces } from "../world/world";

test("the world rebuilds the same from its seed", () => {
  const rebuilt = generate();
  const shipped = readFileSync(join(DATA, "traces.jsonl"), "utf8").trim().split("\n");
  expect(rebuilt.traces.map((trace) => JSON.stringify(trace))).toEqual(shipped);
});

test("counts: 300 traces, 220 catalogue items, 30 in the sample with 13 faults", () => {
  expect(traces().length).toBe(300);
  expect(catalogue().length).toBe(220);
  const sample = planted().filter((row) => row.set === "sample");
  expect(sample.length).toBe(30);
  expect(sample.filter((row) => row.mode !== "none").length).toBe(13);
});

test("every planted fault is the only fault in its trace, and clean traces are clean", () => {
  const placesById = new Map(
    catalogue().map((place) => [place.id, { ...place, price_eur: Number(place.price_eur) }]),
  );
  const plantedMode = Object.fromEntries(planted().map((row) => [row.trace_id, row.mode]));
  for (const trace of traces()) {
    const mode = plantedMode[trace.trace_id];
    const expectedFaults = mode === "none" ? [] : [mode];
    const foundFaults = findFaults(trace, placesById);
    expect([trace.trace_id, ...foundFaults]).toEqual([trace.trace_id, ...expectedFaults]);
  }
});

test("judges: mobility judge passes the bar, generic judge does not", () => {
  const expertLabels = dataCsv("expert-labels.csv");
  const inesSays = Object.fromEntries(expertLabels.map((row) => [row.trace_id, row.label]));
  // How often the judge agrees with Ines: on the drafts she passed, then on the drafts she failed.
  const agreementRates = (file: string) => {
    const verdicts = dataCsv(`judges/${file}`);
    const inesPassed = verdicts.filter((row) => inesSays[row.trace_id] === "pass");
    const inesFailed = verdicts.filter((row) => inesSays[row.trace_id] === "fail");
    const judgePassed = inesPassed.filter((row) => row.verdict === "pass");
    const judgeFailed = inesFailed.filter((row) => row.verdict === "fail");
    const rates = [judgePassed.length / inesPassed.length, judgeFailed.length / inesFailed.length];
    return rates.map((rate) => rate.toFixed(2));
  };
  expect(agreementRates("judge-mobility-pass-fail.csv")).toEqual(["0.93", "0.87"]);
  expect(agreementRates("judge-generic-pass-fail.csv")).toEqual(["0.97", "0.37"]);
  const golden = dataCsv("golden-set.csv").map((row) => row.trace_id);
  const train = new Set(dataCsv("splits/train.csv").map((row) => row.trace_id));
  expect(golden.length).toBe(40);
  expect(golden.some((id) => train.has(id))).toBe(false);
});

test("releases: the cheaper model wins on average and fails mobility", () => {
  const summary = dataCsv("releases/summary.csv");
  const releases = Object.fromEntries(summary.map((row) => [row.release, row]));
  const live = releases.live;
  const cheaper = releases["cheaper-model"];
  expect([live.pass_rate, cheaper.pass_rate]).toEqual(["0.86", "0.88"]);
  expect([live["ignores-mobility"], cheaper["ignores-mobility"]]).toEqual(["1", "7"]);
  expect(live.step_free_requests).toBe("26");
});

const AB_TEST_STORY =
  "A/B test: a 2 point lift whose 95% interval crosses zero, and a refund guardrail breach";

test(AB_TEST_STORY, () => {
  const visitors = dataCsv("ab-test.csv");
  const inArm = (arm: string) => visitors.filter((row) => row.arm === arm);
  const bookingRate = (rows: Record<string, string>[]) =>
    rows.filter((row) => row.booked === "1").length / rows.length;
  const designerRate = bookingRate(inArm("designer"));
  const instantRate = bookingRate(inArm("instant"));
  const designerVariance = (designerRate * (1 - designerRate)) / 1200;
  const instantVariance = (instantRate * (1 - instantRate)) / 1200;
  const standardError = Math.sqrt(designerVariance + instantVariance);
  expect([designerRate.toFixed(3), instantRate.toFixed(3)]).toEqual(["0.180", "0.200"]);
  // The lower end of the 95% interval is below zero, so the lift could be nothing.
  expect(instantRate - designerRate - 1.96 * standardError).toBeLessThan(0);
  const closedOnArrival = (arm: string) =>
    inArm(arm).filter((row) => row.refund_reason === "closed on arrival").length;
  expect(closedOnArrival("instant")).toBeGreaterThan(closedOnArrival("designer") * 3);
  const lisbonRate = (arm: string) =>
    bookingRate(inArm(arm).filter((row) => row.trip_type === "lisbon weekend"));
  expect(lisbonRate("instant") - lisbonRate("designer")).toBeGreaterThan(0.05);
});
