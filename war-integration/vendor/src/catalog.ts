import type { BlockDefinition } from "./types.ts";

// IDs and symbols are published API. Never reuse or renumber a listed ID.
export const BLOCK_CATALOG = [
  { id: 10, symbol: "COLETAR_MADEIRA", alias: "collect_wood", nameEn: "Collect Wood", category: "economy" },
  { id: 11, symbol: "COLETAR_MINERIO", alias: "collect_ore", nameEn: "Collect Ore", category: "economy" },
  { id: 12, symbol: "CONSTRUIR_ARMARIA", alias: "build_armory", nameEn: "Build Armory", category: "economy" },
  { id: 13, symbol: "CONSTRUIR_ENFERMARIA", alias: "build_hospital", nameEn: "Build Hospital", category: "economy" },
  { id: 20, symbol: "EQUIPAR_ESPADA", alias: "equip_sword", nameEn: "Equip Sword", category: "equipment" },
  { id: 21, symbol: "EQUIPAR_LANCA", alias: "equip_spear", nameEn: "Equip Spear", category: "equipment" },
  { id: 22, symbol: "EQUIPAR_MACHADO", alias: "equip_axe", nameEn: "Equip Axe", category: "equipment" },
  { id: 23, symbol: "TROCAR_EQUIPAMENTO", alias: "change_equipment", nameEn: "Change Equipment", category: "equipment" },
  { id: 30, symbol: "ATACAR_ALVO", alias: "attack_target", nameEn: "Attack Target", category: "combat" },
  { id: 31, symbol: "IR_ATACAR_TIPO", alias: "approach_and_attack_weapon_type", nameEn: "Approach and Attack Weapon Type", category: "combat" },
  { id: 32, symbol: "MANTER_POSICAO", alias: "hold_position", nameEn: "Hold Position", category: "combat" },
  { id: 33, symbol: "PROTEGER_ALIADO", alias: "protect_ally", nameEn: "Protect Ally", category: "combat" },
  { id: 34, symbol: "PROTEGER_CONSTRUCAO", alias: "protect_building", nameEn: "Protect Building", category: "combat" },
  { id: 35, symbol: "RECUAR", alias: "retreat", nameEn: "Retreat", category: "combat" },
  { id: 36, symbol: "ATACAR_CONSTRUCAO", alias: "attack_building", nameEn: "Attack Building", category: "combat" },
  { id: 37, symbol: "IR_DESTRUIR_CONSTRUCAO", alias: "go_destroy_building", nameEn: "Go Destroy Building", category: "combat" },
  { id: 40, symbol: "CAPTURAR_CAIDO", alias: "pick_up_downed", nameEn: "Pick Up Downed Soldier", category: "transport" },
  { id: 41, symbol: "SOLTAR_INCAPACITADO", alias: "drop_downed", nameEn: "Drop Downed Soldier", category: "transport" },
  { id: 42, symbol: "TRATAR_ALIADO", alias: "treat_ally", nameEn: "Treat Ally", category: "transport" },
  { id: 43, symbol: "IR_RESGATAR_ALIADO", alias: "go_rescue_ally", nameEn: "Go Rescue Ally", category: "transport" },
  { id: 44, symbol: "IR_CAPTURAR_INIMIGO", alias: "go_pick_up_downed_enemy", nameEn: "Go Pick Up Downed Enemy", category: "transport" },
  { id: 45, symbol: "IR_CAPTURAR_CAIDO", alias: "go_pick_up_nearest_downed", nameEn: "Go Pick Up Nearest Downed Soldier", category: "transport" },
  { id: 50, symbol: "EXISTE_INIMIGO_VISIVEL", alias: "enemy_visible", nameEn: "Enemy Visible", category: "conditions" },
  { id: 51, symbol: "EXISTE_ALIADO_INCAPACITADO", alias: "downed_ally_exists", nameEn: "Downed Ally Exists", category: "conditions" },
  { id: 52, symbol: "ESTOU_DESARMADO", alias: "is_unarmed", nameEn: "Is Unarmed", category: "conditions" },
  { id: 53, symbol: "MINHA_ARMA_ESPADA", alias: "my_weapon_is_sword", nameEn: "My Weapon Is Sword", category: "conditions" },
  { id: 54, symbol: "MINHA_ARMA_LANCA", alias: "my_weapon_is_spear", nameEn: "My Weapon Is Spear", category: "conditions" },
  { id: 55, symbol: "MINHA_ARMA_MACHADO", alias: "my_weapon_is_axe", nameEn: "My Weapon Is Axe", category: "conditions" },
  { id: 56, symbol: "ARMARIA_EXISTE", alias: "armory_exists", nameEn: "Armory Exists", category: "conditions" },
  { id: 57, symbol: "ENFERMARIA_EXISTE", alias: "hospital_exists", nameEn: "Hospital Exists", category: "conditions" },
  { id: 58, symbol: "RECURSOS_SUFICIENTES", alias: "resources_sufficient", nameEn: "Resources Sufficient", category: "conditions" },
  { id: 59, symbol: "NUMERO_ALIADOS", alias: "ally_count", nameEn: "Ally Count", category: "conditions" },
  { id: 60, symbol: "NUMERO_INIMIGOS", alias: "enemy_count", nameEn: "Enemy Count", category: "conditions" },
  { id: 61, symbol: "ALVO_DESARMADO", alias: "target_is_unarmed", nameEn: "Target Is Unarmed", category: "conditions" },
  { id: 62, symbol: "ARMA_UM_USO", alias: "weapon_has_one_use_left", nameEn: "Weapon Has One Use Left", category: "conditions" },
  { id: 63, symbol: "PERTO_ARMARIA", alias: "near_armory", nameEn: "Near Armory", category: "conditions" },
  { id: 64, symbol: "CARREGANDO_ALGUEM", alias: "carrying_someone", nameEn: "Carrying Someone", category: "conditions" },
  { id: 65, symbol: "ALVO_ESPADA", alias: "target_has_sword", nameEn: "Target Has Sword", category: "conditions" },
  { id: 66, symbol: "ALVO_LANCA", alias: "target_has_spear", nameEn: "Target Has Spear", category: "conditions" },
  { id: 67, symbol: "ALVO_MACHADO", alias: "target_has_axe", nameEn: "Target Has Axe", category: "conditions" },
  { id: 68, symbol: "ALIADO_VISIVEL_USA_ARMA", alias: "visible_ally_has_weapon", nameEn: "Visible Ally Has Weapon", category: "conditions" },
  { id: 69, symbol: "PERTO_ALVO", alias: "near_target", nameEn: "Near Target", category: "conditions" },
  { id: 70, symbol: "IF", alias: "if", nameEn: "If", category: "control" },
  { id: 71, symbol: "ELSE", alias: "else", nameEn: "Else", category: "control" },
  { id: 72, symbol: "REPEAT_FOREVER", alias: "repeat_forever", nameEn: "Repeat Forever", category: "control" },
  { id: 73, symbol: "REPEAT_UNTIL", alias: "repeat_until", nameEn: "Repeat Until", category: "control" },
  { id: 74, symbol: "WHILE", alias: "while", nameEn: "While", category: "control" },
  { id: 75, symbol: "BREAK", alias: "break_loop", nameEn: "Break Loop", category: "control" },
  { id: 76, symbol: "CONTINUE", alias: "continue_loop", nameEn: "Continue Loop", category: "control" },
  { id: 77, symbol: "WAIT", alias: "wait", nameEn: "Wait", category: "control" },
  { id: 80, symbol: "MOVE_UP", alias: "move_up", nameEn: "Move Up", category: "movement" },
  { id: 81, symbol: "MOVE_DOWN", alias: "move_down", nameEn: "Move Down", category: "movement" },
  { id: 82, symbol: "MOVE_LEFT", alias: "move_left", nameEn: "Move Left", category: "movement" },
  { id: 83, symbol: "MOVE_RIGHT", alias: "move_right", nameEn: "Move Right", category: "movement" },
  { id: 84, symbol: "MOVE_TOWARD_TARGET", alias: "move_toward_target", nameEn: "Move Toward Target", category: "movement" },
  { id: 85, symbol: "GO_ARMORY", alias: "go_to_armory", nameEn: "Go to Armory", category: "movement" },
  { id: 86, symbol: "GO_HOSPITAL", alias: "go_to_hospital", nameEn: "Go to Hospital", category: "movement" },
  { id: 87, symbol: "GO_FOREST", alias: "go_to_forest", nameEn: "Go to Forest", category: "movement" },
  { id: 88, symbol: "GO_MINE", alias: "go_to_mine", nameEn: "Go to Mine", category: "movement" },
  { id: 89, symbol: "GO_ALLY", alias: "go_to_ally", nameEn: "Go to Ally", category: "movement" },
  { id: 90, symbol: "GO_ENEMY", alias: "go_to_enemy", nameEn: "Go to Enemy", category: "movement" },
  { id: 91, symbol: "GO_DOWNED", alias: "go_to_downed", nameEn: "Go to Downed Soldier", category: "movement" },
  { id: 92, symbol: "GO_ENEMY_BUILDING", alias: "go_to_enemy_building", nameEn: "Go to Enemy Building", category: "movement" },
  { id: 93, symbol: "STOP_MOVEMENT", alias: "stop_movement", nameEn: "Stop Movement", category: "movement" },
  { id: 100, symbol: "SELECT_NEAREST_ENEMY", alias: "select_nearest_enemy", nameEn: "Select Nearest Enemy", category: "selection" },
  { id: 101, symbol: "SELECT_NEAREST_ALLY", alias: "select_nearest_ally", nameEn: "Select Nearest Ally", category: "selection" },
  { id: 102, symbol: "SELECT_NEAREST_DOWNED", alias: "select_nearest_downed", nameEn: "Select Nearest Downed Soldier", category: "selection" },
  { id: 103, symbol: "TARGET_IS_ALLY", alias: "target_is_ally", nameEn: "Target Is Ally", category: "selection" },
  { id: 104, symbol: "TARGET_IS_ENEMY", alias: "target_is_enemy", nameEn: "Target Is Enemy", category: "selection" },
  { id: 105, symbol: "TARGET_IS_DOWNED", alias: "target_is_downed", nameEn: "Target Is Downed", category: "selection" },
  { id: 106, symbol: "ALLY_COUNT_COMPARE", alias: "compare_ally_count", nameEn: "Compare Ally Count", category: "selection" },
  { id: 107, symbol: "ENEMY_COUNT_COMPARE", alias: "compare_enemy_count", nameEn: "Compare Enemy Count", category: "selection" },
  { id: 108, symbol: "TARGET_IS_BUILDING", alias: "target_is_building", nameEn: "Target Is Building", category: "selection" },
  { id: 109, symbol: "ENEMY_DOWNED_EXISTS", alias: "downed_enemy_exists", nameEn: "Downed Enemy Exists", category: "selection" },
] as const satisfies readonly BlockDefinition[];

const ids = new Map<number, BlockDefinition>(BLOCK_CATALOG.map((block) => [block.id, block] as const));
const names = new Map<string, number>();

export function normalizeBlockName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toUpperCase();
}

for (const block of BLOCK_CATALOG) {
  for (const candidate of [block.symbol, block.alias, block.nameEn]) {
    const key = normalizeBlockName(candidate);
    const prior = names.get(key);
    if (prior !== undefined && prior !== block.id) throw new Error(`Duplicate block name: ${candidate}`);
    names.set(key, block.id);
  }
}

export function resolveBlockId(reference: number | string): number | undefined {
  if (typeof reference === "number") return ids.has(reference) ? reference : undefined;
  return names.get(normalizeBlockName(reference));
}

export function getBlockDefinition(reference: number | string): BlockDefinition | undefined {
  const id = resolveBlockId(reference);
  return id === undefined ? undefined : ids.get(id);
}
