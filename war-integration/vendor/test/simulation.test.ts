import assert from "node:assert/strict";
import test from "node:test";
import { hashReplay, parseProgram, simulate } from "../src/index.ts";
import type { Program } from "../src/index.ts";

const empty: Program = { schemaVersion: 1, body: [] };

test("one cardinal movement takes four ticks at the doubled movement speed", () => {
  const movers: Program = { schemaVersion: 1, body: [{ op: 72, body: [{ op: 80 }] }] };
  const result = simulate(movers, empty, { maxSeconds: 1, telemetry: "replay" });
  const steps = result.events!.filter((event) => event.type === "move-step" && event.team === "A");
  assert.equal(steps[0]?.tick, 4);
  assert.ok(steps.every((event) => event.details?.x === 8));
  const first = steps[0]!;
  assert.ok(Math.abs(Number(first.details?.y) - 45) === 1);
});

test("simulation is deterministic and respects the configured time limit", () => {
  const wait: Program = { schemaVersion: 1, body: [{ op: 72, body: [{ op: 77, seconds: 1 }] }] };
  const a = simulate(wait, empty, { maxSeconds: 3, telemetry: "replay" });
  const b = simulate(wait, empty, { maxSeconds: 3, telemetry: "replay" });
  assert.deepEqual(a, b);
  assert.equal(a.winner, "DRAW");
  assert.equal(a.durationSeconds, 3);
  assert.equal(hashReplay(a.events!), hashReplay(b.events!));
});

test("summary telemetry omits replay events", () => {
  const result = simulate(empty, empty, { maxSeconds: 0, telemetry: "summary" });
  assert.equal(result.winner, "DRAW");
  assert.equal(result.events, undefined);
  assert.ok((result.eventCount ?? 0) > 0);
});

test("numeric ally-count reporters can feed parameterized comparisons", () => {
  const compareCounts: Program = {
    schemaVersion: 1,
    body: [{ op: 72, body: [{ op: 70, condition: { op: 106, comparator: "eq", value: { op: 59 } }, then: [{ op: 80 }], else: [{ op: 77, seconds: 1 }] }] }],
  };
  const result = simulate(compareCounts, empty, { maxSeconds: 1, telemetry: "replay" });
  assert.ok(result.events!.some((event) => event.type === "move-step" && event.team === "A"));
});

test("resource collection only credits completed trips", () => {
  const gather: Program = {
    schemaVersion: 1,
    body: [{ op: 72, body: [{ op: 87 }, { op: 10 }] }],
  };
  const result = simulate(gather, empty, { maxSeconds: 30 });
  assert.ok(result.stats.A.woodCollected >= 3);
  assert.equal(result.stats.B.woodCollected, 0);
});

test("the engine accepts a custom duration beyond the competition default", () => {
  const result = simulate(empty, empty, { maxSeconds: 181 });
  assert.equal(result.durationSeconds, 181);
});

test("navigation to an unbuilt armory reaches the build range", () => {
  const builders = parseProgram({ schemaVersion: 1, body: [{ op: "go_to_armory" }, { op: "wait", seconds: 180 }] });
  const result = simulate(builders, empty, { maxSeconds: 10, debug: true });
  const builder = result.debugFrames!.at(-1)!.units.find((unit) => unit.id === "A-0")!;
  assert.ok(Math.abs(builder.x - 10) + Math.abs(builder.y - 42) <= 1);
});

test("repeated unreachable routes preserve all events and the 720-second limit", () => {
  const wait: Program = { schemaVersion: 1, body: [{ op: 77, seconds: 180 }] };
  const attempt = (count: number): Program => ({ schemaVersion: 1,
    body: [...Array.from({ length: count }, () => ({ op: 85 })), { op: 77, seconds: 180 }] });
  const options = { maxSeconds: 720, telemetry: "replay" as const,
    obstacles: [{ x: 9, y: 42 }, { x: 11, y: 42 }, { x: 10, y: 41 }, { x: 10, y: 43 }] };
  const repeated = simulate(attempt(8), wait, options);
  assert.deepEqual(repeated, simulate(attempt(1), wait, options));
  assert.equal(repeated.durationSeconds, 720);
  assert.equal(repeated.winner, "DRAW");
});

test("a failed route is retried after a blocking ally moves", () => {
  const navigation: Program = { schemaVersion: 1, body: [{ op: 85 }] };
  const result = simulate(navigation, empty, { maxSeconds: 3, telemetry: "replay",
    obstacles: [{ x: 7, y: 45 }, { x: 9, y: 45 }, { x: 8, y: 44 }] });
  const steps = result.events!.filter((event) => event.type === "move-step" && event.unitId === "A-0");
  assert.ok(steps.length > 0);
  assert.equal(steps[0]!.tick, 18); // The initial decision failed; the next one saw the free cell.
});

test("the reference reinforcement joins before the exact five-second resolution", () => {
  const red: Program = { schemaVersion: 1, body: [{ op: 100 }, { op: 30 }] };
  const blue: Program = {
    schemaVersion: 1,
    body: [
      { op: 100 },
      { op: 73, condition: { op: 69 }, body: [{ op: 84 }] },
      { op: 30 },
    ],
  };
  const result = simulate(red, blue, { maxSeconds: 5, scenarioId: "reference-combat-protection", telemetry: "replay" });
  const reinforcement = result.events!.find((event) => event.type === "engagement-join" && event.unitId === "B-1");
  const resolution = result.events!.find((event) => event.type === "engagement-resolved");
  assert.ok(reinforcement);
  assert.ok(reinforcement.tick < 70);
  assert.equal(resolution?.tick, 70);
  assert.equal(resolution?.details?.winner, "B");
  assert.equal(result.stats.A.knockdowns, 1);
  assert.equal(result.stats.B.knockdowns, 0);
});

test("the same fixture without the reinforcement lets sword defeat spear", () => {
  const red: Program = { schemaVersion: 1, body: [{ op: 100 }, { op: 30 }] };
  const blue: Program = { schemaVersion: 1, body: [{ op: 77, seconds: 180 }] };
  const result = simulate(red, blue, { maxSeconds: 5, scenarioId: "reference-combat-duel", telemetry: "replay" });
  const resolution = result.events!.find((event) => event.type === "engagement-resolved");
  assert.equal(resolution?.tick, 70);
  assert.equal(resolution?.details?.winner, "A");
  assert.equal(result.stats.B.knockdowns, 1);
  assert.equal(result.stats.A.knockdowns, 0);
});

test("armed defenders defend automatically, but do not attack spontaneously", () => {
  const noOrders: Program = { schemaVersion: 1, body: [{ op: 77, seconds: 180 }] };
  const result = simulate(noOrders, noOrders, { maxSeconds: 5, scenarioId: "reference-combat-duel", telemetry: "replay" });
  assert.equal(result.events!.some((event) => event.type === "engagement-join"), false);
  assert.equal(result.stats.A.knockdowns, 0);
  assert.equal(result.stats.B.knockdowns, 0);
});
