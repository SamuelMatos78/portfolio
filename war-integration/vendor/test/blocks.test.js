import assert from "node:assert/strict";
import test from "node:test";
import { BLOCK_CATALOG, parseProgram } from "../src/index.ts";
import { commandInfo, commandTemplate } from "../game/commands.js";
import { insertBlock, duplicateBlock, moveBlock, removeBlock, setBlockCondition, setBlockParameter, assertBlockBudget } from "../game/block-model.js";

test("all 74 command descriptions and visual defaults produce valid syntax", () => {
  for (const block of BLOCK_CATALOG) {
    assert.ok(commandInfo(block.id).description.length > 15, block.alias);
    const template = commandTemplate(block, BLOCK_CATALOG);
    assert.equal(parseProgram({ schemaVersion: 1, body: [template] }).body[0].op, block.id);
  }
});

test("visual editing preserves nested controls, comparisons and program immutability", () => {
  const empty = { schemaVersion: 1, body: [] };
  let program = insertBlock(empty, ["body"], 72);
  program = insertBlock(program, ["body", 0, "body"], 70);
  program = setBlockCondition(program, ["body", 0, "body", 0], 106);
  program = setBlockParameter(program, ["body", 0, "body", 0, "condition"], "value", { op: 60 });
  program = insertBlock(program, ["body", 0, "body", 0, "then"], 83);
  program = insertBlock(program, ["body", 0, "body", 0, "else"], 77);
  assert.deepEqual(empty.body, []);
  assert.deepEqual(parseProgram(JSON.parse(JSON.stringify(program))), program);
  assert.equal(assertBlockBudget(program), 6);
});

test("block moves, duplication, removal and cycle protection are safe", () => {
  let program = { schemaVersion: 1, body: [{ op: 77, seconds: 1 }, { op: 83, steps: 2 }, { op: 72, body: [] }] };
  const original = structuredClone(program);
  program = moveBlock(program, ["body", 0], ["body"], 2);
  assert.deepEqual(program.body.map((node) => node.op), [83, 77, 72]);
  program = moveBlock(program, ["body", 0], ["body", 2, "body"], 0);
  assert.equal(program.body[1].body[0].op, 83);
  program = duplicateBlock(program, ["body", 0]);
  program = removeBlock(program, ["body", 1]);
  assert.equal(program.body.length, 2);
  assert.throws(() => moveBlock(program, ["body", 1], ["body", 1, "body"], 0), /si mesmo/);
  assert.throws(() => insertBlock(program, ["__proto__"], 77), /inválido/);
  assert.deepEqual(original.body[0], { op: 77, seconds: 1 });
});
