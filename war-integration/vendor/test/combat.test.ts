import assert from "node:assert/strict";
import test from "node:test";
import { RULESET, resolveCombatOutcome } from "../src/index.ts";
import type { Combatant } from "../src/simulation.ts";

const fighter = (id: string, team: "A" | "B", weapon: Combatant["weapon"], weaponEquippedAt = 0): Combatant => ({ id, team, weapon, weaponEquippedAt });

test("reference reinforcement protects the individually advantaged ally", () => {
  const withReinforcement = [fighter("A", "A", "sword"), fighter("B", "B", "spear"), fighter("C", "B", "axe")];
  assert.equal(resolveCombatOutcome(withReinforcement), "B");
  assert.equal(resolveCombatOutcome(withReinforcement.slice(0, 2)), "A");
  assert.equal(resolveCombatOutcome(withReinforcement.map((item) => ({ ...item, team: item.team === "A" ? "B" as const : "A" as const }))), "A");
});

test("unarmed numbers never defeat an armed opponent", () => {
  assert.equal(resolveCombatOutcome([
    fighter("swordsman", "A", "sword"),
    ...Array.from({ length: 5 }, (_, index) => fighter(`unarmed-${index}`, "B", null)),
  ]), "A");
});

test("coverage is cyclic, mixed unresolved fights draw, and same-weapon counts break ties", () => {
  assert.equal(resolveCombatOutcome([fighter("s", "A", "sword"), fighter("p", "B", "spear")]), "A");
  assert.equal(resolveCombatOutcome([fighter("s", "A", "sword"), fighter("a", "A", "axe"), fighter("a2", "B", "axe")]), "DRAW");
  assert.equal(resolveCombatOutcome([fighter("a1", "A", "axe"), fighter("a2", "A", "axe"), fighter("b1", "B", "axe")]), "A");
  assert.equal(resolveCombatOutcome([fighter("old", "A", "spear", 1), fighter("new", "B", "spear", 2)]), "A");
});

test("combat and downed clocks use the 1/14-second grid", () => {
  assert.equal(RULESET.combatTicks, 70);
  assert.equal(RULESET.downedDeathTicks, 420);
});
