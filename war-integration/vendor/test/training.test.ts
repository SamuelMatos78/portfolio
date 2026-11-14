import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { parseTrainingRequest, trainingResponse } from "../game/training-api.ts";
import { parseProgram, simulate } from "../src/index.ts";
import { ArenaBusyError, MAX_BATTLE_SECONDS, MATCH_TIMEOUT_MS, MAX_MATCH_WORKERS, runMatch } from "../game/matches.ts";

const empty = parseProgram({ schemaVersion: 1, body: [] });

test("simultaneous arrival and combat may cancel another mover without crashing", () => {
  const fixture = JSON.parse(readFileSync(new URL("../Darwin/launch/evidence/worker-crash-reproducer.json", import.meta.url), "utf8"));
  const result = simulate(parseProgram(fixture.program), parseProgram(fixture.other), { maxSeconds: 720, telemetry: "replay" });
  assert.ok(result.durationSeconds > 0 && result.durationSeconds <= 720);
  assert.ok(result.events!.some((event) => event.type === "engagement-join"));
  assert.equal(result.teams.A.total, 10);
  assert.equal(result.teams.B.total, 10);
});

test("arena allows 720 simulated seconds and 720 real seconds per worker", () => {
  assert.equal(MAX_BATTLE_SECONDS, 720);
  assert.equal(MATCH_TIMEOUT_MS, 720_000);
});

test("arena runs three full-length matches and refuses a fourth concurrent job", async () => {
  assert.equal(MAX_MATCH_WORKERS, 3);
  const wait = parseProgram({ schemaVersion: 1, body: [{ op: 77, seconds: 180 }] });
  const jobs = Array.from({ length: 3 }, () => runMatch(wait, wait, 720, false));
  await assert.rejects(runMatch(wait, wait, 720, false), ArenaBusyError);
  const results = await Promise.all(jobs);
  assert.ok(results.every((result) => result.durationSeconds === 720 && result.winner === "DRAW"));
});

test("training accepts object or string programs and rejects invalid requests", () => {
  const parsed = parseTrainingRequest({ programA: empty, programB: JSON.stringify(empty), maxSeconds: 30 });
  assert.deepEqual(parsed.programA, parsed.programB);
  assert.equal(parsed.maxSeconds, 30);
  assert.equal(parseTrainingRequest({ programA: empty, programB: empty }).maxSeconds, 720);
  assert.equal(parseTrainingRequest({ programA: empty, programB: empty, maxSeconds: 720 }).maxSeconds, 720);
  assert.throws(() => parseTrainingRequest({ programA: empty }), /programB/);
  assert.throws(() => parseTrainingRequest({ programA: empty, programB: empty, maxSeconds: 721 }), /720/);
  assert.throws(() => parseTrainingRequest({ programA: empty, programB: empty, maxSeconds: "30" }), /inteiro/);
  assert.throws(() => parseTrainingRequest({ programA: empty, programB: empty, maxSeconds: null }), /inteiro/);
  assert.throws(() => parseTrainingRequest({ programA: empty, programB: empty, maxSecond: 30 }), /desconhecido/);
});

test("training returns final alive and equipment counts without replay frames", () => {
  const result = simulate(empty, empty, { maxSeconds: 1, debug: true });
  const response = trainingResponse(result, empty, empty, 1);
  assert.equal(response.winner, "DRAW");
  assert.deepEqual(response.teams.A, { total: 10, alive: 10, active: 10, incapacitated: 0, dead: 0, armed: 0, unarmed: 10 });
  assert.equal("debugFrames" in response, false);
  assert.equal(response.programHashes.A, response.programHashes.B);
  assert.equal(response.stats.A.armoriesBuilt, 0);
});

test("armory statistics count actual completions, not opcodes, hospitals or repeated attempts", () => {
  const wait = parseProgram({ schemaVersion: 1, body: [{ op: 77, seconds: 180 }] });
  const builders = parseProgram({ schemaVersion: 1, body: [87, 10, 88, 11, 85, 12].map((op) => ({ op })) });
  const early = simulate(builders, wait, { maxSeconds: 1 });
  assert.equal(early.stats.A.armoriesBuilt, 0);
  const built = simulate(builders, wait, { maxSeconds: 720, telemetry: "replay" });
  assert.equal(built.stats.A.armoriesBuilt, 1);
  assert.equal(built.stats.B.armoriesBuilt, 0);
  assert.equal(built.stats.A.armoriesBuilt, built.events!.filter((event) =>
    event.team === "A" && event.type === "building-created" && event.details?.type === "armory").length);
  assert.equal(trainingResponse(built, builders, wait, 720).stats.A.armoriesBuilt, 1);
  const hospital = parseProgram({ schemaVersion: 1, body: [87, 10, 88, 11, 86, 13].map((op) => ({ op })) });
  const treated = simulate(hospital, wait, { maxSeconds: 720 });
  assert.equal(treated.stats.A.buildingsCreated, 1);
  assert.equal(treated.stats.A.armoriesBuilt, 0);
});

test("final counts include incapacitated living soldiers and exclude dead equipment", () => {
  const attack = parseProgram({ schemaVersion: 1, body: [{ op: "select_nearest_enemy" }, { op: "attack_target" }, { op: "wait", seconds: 180 }] });
  const wait = parseProgram({ schemaVersion: 1, body: [{ op: "wait", seconds: 180 }] });
  const downed = simulate(attack, wait, { scenarioId: "reference-combat-duel", maxSeconds: 5 });
  assert.equal(downed.teams.B.alive, 10);
  assert.equal(downed.teams.B.active, 9);
  assert.equal(downed.teams.B.incapacitated, 1);
  const dead = simulate(attack, wait, { scenarioId: "reference-combat-duel", maxSeconds: 36 });
  assert.equal(dead.teams.B.alive, 9);
  assert.equal(dead.teams.B.dead, 1);
  assert.equal(dead.teams.B.unarmed, 9);
  assert.equal(dead.teams.B.armed, 0);
  for (const side of [dead.teams.A, dead.teams.B]) {
    assert.equal(side.alive, side.armed + side.unarmed);
    assert.equal(side.alive, side.active + side.incapacitated);
    assert.equal(side.total, side.alive + side.dead);
  }
});
