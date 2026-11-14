import assert from "node:assert/strict";
import test from "node:test";
import { parseProgram, simulate } from "../src/index.ts";

const defender = parseProgram({ schemaVersion: 1, body: [{ op: "wait", seconds: 180 }] });

function carrier(drop: boolean) {
  return parseProgram({ schemaVersion: 1, body: [
    { op: "select_nearest_enemy" }, { op: "attack_target" }, { op: "go_pick_up_downed_enemy" },
    { op: "wait", seconds: drop ? 40 : 180 },
    ...(drop ? [{ op: "drop_downed" }, { op: "wait", seconds: 180 }] : []),
  ] });
}

test("a carried incapacitated soldier survives beyond the original death deadline", () => {
  const result = simulate(carrier(false), defender, { scenarioId: "reference-combat-duel", maxSeconds: 60, debug: true, telemetry: "replay" });
  const patient = result.debugFrames!.at(-1)!.units.find((unit) => unit.id === "B-0")!;
  assert.equal(patient.state, "INCAPACITATED");
  assert.equal(patient.carriedBy, "A-0");
  assert.equal(patient.deathRemainingSeconds, 28);
  assert.ok(!result.events!.some((event) => event.type === "soldier-died" && event.unitId === "B-0"));
});

test("dropping resumes only the remaining death time and invalidates the old deadline", () => {
  const result = simulate(carrier(true), defender, { scenarioId: "reference-combat-duel", maxSeconds: 80, telemetry: "replay" });
  const events = result.events!;
  const down = events.find((event) => event.type === "soldier-downed" && event.unitId === "B-0")!;
  const pickup = events.find((event) => event.type === "soldier-picked-up" && event.targetId === "B-0")!;
  const drop = events.find((event) => event.type === "soldier-dropped" && event.targetId === "B-0")!;
  const death = events.find((event) => event.type === "soldier-died" && event.unitId === "B-0")!;
  assert.ok(down && pickup && drop && death);
  assert.ok(drop.tick - pickup.tick > 30 * 14);
  assert.equal((pickup.tick - down.tick) + (death.tick - drop.tick), 30 * 14);
  assert.equal(death.tick, 76 * 14);
});

test("movement while carrying takes seven ticks per cell", () => {
  const program = parseProgram({ schemaVersion: 1, body: [
    { op: "select_nearest_enemy" }, { op: "attack_target" }, { op: "go_pick_up_downed_enemy" },
    { op: "move_up", steps: 1 }, { op: "wait", seconds: 180 },
  ] });
  const result = simulate(program, defender, { scenarioId: "reference-combat-duel", maxSeconds: 12, telemetry: "replay" });
  const pickup = result.events!.find((event) => event.type === "soldier-picked-up" && event.unitId === "A-0")!;
  const move = result.events!.find((event) => event.type === "move-step" && event.unitId === "A-0" && event.tick > pickup.tick)!;
  assert.ok(pickup && move);
  assert.equal(move.tick - pickup.tick, 7);
});
