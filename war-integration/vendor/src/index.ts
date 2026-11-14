export { BLOCK_CATALOG, getBlockDefinition, normalizeBlockName, resolveBlockId } from "./catalog.ts";
export { ENGINE_VERSION, RULESET, RULESET_VERSION, secondsToTicks, ticksToSeconds } from "./rules.ts";
export {
  createEmptyProgram,
  MAX_DECISION_OPERATIONS,
  MAX_PROGRAM_DEPTH,
  MAX_PROGRAM_NODES,
  normalizeProgramAliases,
  parseProgram,
  PROGRAM_IMPORT_JSON_SCHEMA,
  PROGRAM_JSON_SCHEMA,
  PROGRAM_SCHEMA_VERSION,
  validateProgram,
} from "./program.ts";
export { resolveCombatOutcome, simulate } from "./simulation.ts";
export type { Combatant } from "./simulation.ts";
export { canonicalStringify, hashProgram, hashReplay, serializeProgram, stableHash } from "./serialization.ts";
export type {
  BattleEvent,
  BlockDefinition,
  DebugFrame,
  DebugMarker,
  DebugUnit,
  Program,
  ProgramInput,
  ProgramNode,
  Ruleset,
  SimulationOptions,
  SimulationResult,
  TeamId,
  TeamStats,
  TeamOutcome,
  TelemetryMode,
  ValidationIssue,
  ValidationResult,
  WeaponType,
  Winner,
} from "./types.ts";
