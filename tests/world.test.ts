// Guards the world: it rebuilds byte for byte from its seed, and every planted number the course uses holds.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generate } from "../world/generate";
import { findFaults } from "../world/rules";
import { catalogue, DATA, dataCsv, planted, traces } from "../world/world";

test("the world rebuilds the same from its seed", () => {
  const g = generate();
  const shipped = readFileSync(join(DATA, "traces.jsonl"), "utf8").trim().split("\n");
  expect(g.traces.map((t) => JSON.stringify(t))).toEqual(shipped);
});

test("counts: 300 traces, 220 catalogue items, 30 in the sample with 13 faults", () => {
  expect(traces().length).toBe(300);
  expect(catalogue().length).toBe(220);
  const s = planted().filter((p) => p.set === "sample");
  expect(s.length).toBe(30);
  expect(s.filter((p) => p.mode !== "none").length).toBe(13);
});

test("every planted fault is the only fault in its trace, and clean traces are clean", () => {
  const cat = new Map(catalogue().map((c) => [c.id, { ...c, price_eur: Number(c.price_eur) }]));
  const key = Object.fromEntries(planted().map((p) => [p.trace_id, p.mode]));
  for (const t of traces())
    expect([t.trace_id, ...findFaults(t, cat as any)]).toEqual([
      t.trace_id,
      ...(key[t.trace_id] === "none" ? [] : [key[t.trace_id]]),
    ]);
});

test("judges: mobility judge passes the bar, generic judge does not", () => {
  const ines = Object.fromEntries(dataCsv("expert-labels.csv").map((r) => [r.trace_id, r.label]));
  const rates = (file: string) => {
    const v = dataCsv(`judges/${file}`);
    const P = v.filter((r) => ines[r.trace_id] === "pass"),
      N = v.filter((r) => ines[r.trace_id] === "fail");
    return [
      P.filter((r) => r.verdict === "pass").length / P.length,
      N.filter((r) => r.verdict === "fail").length / N.length,
    ];
  };
  expect(rates("judge-mobility-pass-fail.csv").map((x) => x.toFixed(2))).toEqual(["0.93", "0.87"]);
  expect(rates("judge-generic-pass-fail.csv").map((x) => x.toFixed(2))).toEqual(["0.97", "0.37"]);
  const golden = dataCsv("golden-set.csv").map((r) => r.trace_id);
  const train = new Set(dataCsv("splits/train.csv").map((r) => r.trace_id));
  expect(golden.length).toBe(40);
  expect(golden.some((id) => train.has(id))).toBe(false);
});

test("releases: the cheaper model wins on average and fails mobility", () => {
  const s = Object.fromEntries(dataCsv("releases/summary.csv").map((r) => [r.release, r]));
  expect([s.live.pass_rate, s["cheaper-model"].pass_rate]).toEqual(["0.86", "0.88"]);
  expect([s.live["ignores-mobility"], s["cheaper-model"]["ignores-mobility"]]).toEqual(["1", "7"]);
  expect(s.live.step_free_requests).toBe("26");
});

test("A/B test: a 2 point lift whose 95% interval crosses zero, and a refund guardrail breach", () => {
  const ab = dataCsv("ab-test.csv");
  const arm = (a: string) => ab.filter((r) => r.arm === a);
  const rate = (rs: Record<string, string>[]) =>
    rs.filter((r) => r.booked === "1").length / rs.length;
  const c = rate(arm("designer")),
    t = rate(arm("instant"));
  const se = Math.sqrt((c * (1 - c)) / 1200 + (t * (1 - t)) / 1200);
  expect([c.toFixed(3), t.toFixed(3)]).toEqual(["0.180", "0.200"]);
  expect(t - c - 1.96 * se).toBeLessThan(0);
  const closed = (a: string) =>
    arm(a).filter((r) => r.refund_reason === "closed on arrival").length;
  expect(closed("instant")).toBeGreaterThan(closed("designer") * 3);
  const lis = (a: string) => rate(arm(a).filter((r) => r.trip_type === "lisbon weekend"));
  expect(lis("instant") - lis("designer")).toBeGreaterThan(0.05);
});
