import type { Program } from "../src/types.ts";
import { parseProgram } from "../src/program.ts";

/** A browser starter, mirrored for the frozen Evil Darwin baseline. */
export function starterStrategy(direction: "move_left" | "move_right" = "move_right"): Program {
  return parseProgram(readableStarter(direction));
}

export function readableStarter(direction: "move_left" | "move_right" = "move_right"): unknown {
  // Keep the initial editor readable while the engine uses canonical numeric IDs.
  return { schemaVersion: 1, body: [{ op: "repeat_forever", body: [
    { op: "if", condition: { op: "is_unarmed" }, then: [
      { op: "if", condition: { op: "armory_exists" }, then: [
        { op: "go_to_armory" }, { op: "equip_sword" },
        { op: "if", condition: { op: "is_unarmed" }, then: [
          { op: "go_to_forest" }, { op: "collect_wood" },
          { op: "go_to_mine" }, { op: "collect_ore" }, { op: "collect_ore" },
        ] },
      ], else: [
        { op: "if", condition: { op: "resources_sufficient", item: "armory" }, then: [
          { op: "go_to_armory" }, { op: "build_armory" },
        ], else: [
          { op: "go_to_forest" }, { op: "collect_wood" },
          { op: "go_to_mine" }, { op: "collect_ore" }, { op: "collect_ore" },
        ] },
      ] },
    ], else: [
      { op: "if", condition: { op: "enemy_visible" }, then: [
        { op: "select_nearest_enemy" },
        { op: "if", condition: { op: "near_target" }, then: [{ op: "attack_target" }],
          else: [{ op: "move_toward_target", steps: 1 }] },
      ], else: [{ op: direction, steps: 4 }] },
    ] }, { op: "wait", seconds: 1 },
  ] }] };
}
