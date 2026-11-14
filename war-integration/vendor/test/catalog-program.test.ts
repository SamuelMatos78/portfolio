import assert from "node:assert/strict";
import test from "node:test";
import {
  BLOCK_CATALOG,
  hashProgram,
  parseProgram,
  PROGRAM_IMPORT_JSON_SCHEMA,
  PROGRAM_JSON_SCHEMA,
  resolveBlockId,
  serializeProgram,
  validateProgram,
} from "../src/index.ts";

test("catalog publishes the fixed IDs with unique English aliases", () => {
  assert.equal(BLOCK_CATALOG.length, 74);
  assert.equal(new Set(BLOCK_CATALOG.map((block) => block.id)).size, 74);
  assert.equal(new Set(BLOCK_CATALOG.map((block) => block.alias)).size, 74);
  assert.equal(resolveBlockId("COLETAR_MINERIO"), 11);
  assert.equal(resolveBlockId("collect_ore"), 11);
  assert.equal(resolveBlockId("Collect Ore"), 11);
  assert.equal(resolveBlockId("Coletar minério"), 11);
  assert.equal(resolveBlockId("  go to forest "), 87);
  assert.equal(resolveBlockId(100), 100);
  assert.equal(resolveBlockId(999), undefined);
  assert.equal(resolveBlockId("unknown_command"), undefined);
});

test("named operation imports normalize to stable numeric IDs", () => {
  const imported = {
    schemaVersion: 1,
    body: [{ op: "repeat_forever", body: [{ op: "IF", condition: { op: "enemy_visible" }, then: [{ op: "select_nearest_enemy" }, { op: "attack_target" }], else: [{ op: "wait", seconds: 1 }] }] }],
  };
  const normalized = parseProgram(imported);
  assert.equal(normalized.body[0]?.op, 72);
  const loopBody = normalized.body[0]?.body as Array<Record<string, unknown>>;
  assert.equal(loopBody[0]?.op, 70);
  assert.equal(serializeProgram(imported), serializeProgram(normalized));
  assert.equal(hashProgram(imported), hashProgram(normalized));
});

test("validator rejects unknown names, reserved IDs, malformed loops, and numeric counts as booleans", () => {
  assert.throws(() => parseProgram({ schemaVersion: 1, body: [{ op: "launch_missiles" }] }), /Unknown block name/);
  assert.equal(validateProgram({ schemaVersion: 1, body: [{ op: 14 }] }).valid, false);
  assert.equal(validateProgram({ schemaVersion: 1, body: [{ op: 70, condition: { op: 59 }, then: [] }] }).valid, false);
  assert.equal(validateProgram({ schemaVersion: 1, body: [{ op: 74, condition: { op: 50 }, body: [{ op: 77, seconds: 0.1 }] }] }).valid, false);
  assert.equal(validateProgram({ schemaVersion: 1, body: [{ op: 70, condition: { op: 106, comparator: "gt", value: { op: 59 } }, then: [] }] }).valid, true);
  assert.equal(validateProgram({ schemaVersion: 1, body: [], unexpected: true }).valid, false);
});

test("canonical and import JSON Schemas are versioned and expose aliases", () => {
  assert.equal(PROGRAM_JSON_SCHEMA.properties.schemaVersion && (PROGRAM_JSON_SCHEMA.properties.schemaVersion as { const: number }).const, 1);
  assert.notEqual(PROGRAM_IMPORT_JSON_SCHEMA.$id, PROGRAM_JSON_SCHEMA.$id);
  assert.equal(PROGRAM_IMPORT_JSON_SCHEMA.$defs.node !== undefined, true);
});
