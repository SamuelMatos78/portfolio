import assert from "node:assert/strict";
import test from "node:test";
import { freezeVillain, loadVillains } from "../game/villains.ts";
import { starterStrategy } from "../game/strategies.ts";
import { hashProgram } from "../src/serialization.ts";

test("the arena freezes an independent opponent snapshot and its nested instructions", () => {
  const source = starterStrategy("move_left");
  const villain = freezeVillain({ id: "test", name: "Test", title: "Frozen", description: "Test snapshot", color: "#fff" }, source);
  const hash = villain.hash;
  source.body.length = 0;
  assert.equal(villain.program.body.length, 1);
  assert.ok(Object.isFrozen(villain.program.body));
  assert.ok(Object.isFrozen(villain.program.body[0]));
  assert.throws(() => { villain.program.body[0]!.op = 77; }, TypeError);
  assert.equal(hashProgram(villain.program), hash);
});

test("all four published villains load as validated frozen builds", async () => {
  const villains = await loadVillains();
  assert.deepEqual([...villains.keys()], ["claude", "astra", "gemini", "evil-darwin"]);
  for (const villain of villains.values()) {
    assert.ok(villain.program.body.length > 0);
    assert.ok(Object.isFrozen(villain));
    assert.equal(villain.hash, hashProgram(villain.program));
  }
});
