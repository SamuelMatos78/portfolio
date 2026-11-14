export type TeamId = "A" | "B";
export type Winner = TeamId | "DRAW";
export type WeaponType = "sword" | "spear" | "axe";
export type TelemetryMode = "none" | "summary" | "training" | "replay";

export interface ProgramNode {
  op: number;
  [key: string]: unknown;
}

export interface Program {
  schemaVersion: 1;
  body: ProgramNode[];
}

export interface ProgramInput {
  schemaVersion: number;
  body: unknown[];
}

export interface SimulationOptions {
  maxSeconds?: number;
  telemetry?: TelemetryMode;
  scenarioId?: string;
  obstacles?: Array<{ x: number; y: number }>;
  /** Include compact position snapshots for the local debug viewer. */
  debug?: boolean;
}

export interface DebugUnit {
  id: string;
  team: TeamId;
  x: number;
  y: number;
  state: string;
  weapon: WeaponType | null;
  durability: number;
  targetId: string | null;
  carryingId: string | null;
  carriedBy: string | null;
  deathRemainingSeconds: number | null;
}

export interface DebugMarker {
  kind: "forest" | "mine" | "armory" | "hospital";
  team: TeamId;
  x: number;
  y: number;
  hp?: number;
}

export interface DebugFrame {
  tick: number;
  units: DebugUnit[];
  markers: DebugMarker[];
  teams: Record<TeamId, { wood: number; ore: number; stats: TeamStats }>;
}

export interface TeamStats {
  soldiersEquipped: number;
  knockdowns: number;
  deaths: number;
  rescues: number;
  captures: number;
  woodCollected: number;
  oreCollected: number;
  weaponsCrafted: number;
  weaponsBroken: number;
  buildingsCreated: number;
  /** Completed armory constructions, including rebuilds after destruction. */
  armoriesBuilt: number;
  buildingsDestroyed: number;
  durationSeconds: number;
}

/** Final counts: alive includes incapacitated soldiers; equipment counts exclude dead units. */
export interface TeamOutcome {
  total: number;
  alive: number;
  active: number;
  incapacitated: number;
  dead: number;
  armed: number;
  unarmed: number;
}

export interface BattleEvent {
  tick: number;
  type: string;
  team?: TeamId;
  unitId?: string;
  targetId?: string;
  details?: Record<string, string | number | boolean | null>;
}

export interface SimulationResult {
  winner: Winner;
  durationSeconds: number;
  stats: Record<TeamId, TeamStats>;
  teams: Record<TeamId, TeamOutcome>;
  eventCount: number;
  events?: BattleEvent[];
  debugFrames?: DebugFrame[];
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
}

export interface BlockDefinition {
  readonly id: number;
  readonly symbol: string;
  readonly alias: string;
  readonly nameEn: string;
  readonly category: "economy" | "equipment" | "combat" | "transport" | "conditions" | "control" | "movement" | "selection";
}

export interface WeaponCost {
  wood: number;
  ore: number;
  ticks: number;
}

export interface Ruleset {
  readonly version: string;
  readonly mapSize: number;
  readonly teamSize: number;
  readonly tickRate: number;
  readonly maxSeconds: number;
  readonly visionRadius: number;
  readonly combatTicks: number;
  readonly downedDeathTicks: number;
  readonly movement: Readonly<{ normalTicks: number; carryingTicks: number }>;
  readonly weapons: Readonly<Record<WeaponType, WeaponCost>>;
  readonly buildings: Readonly<Record<"armory" | "hospital", { wood: number; ore: number; ticks: number; hp: number }>>;
  readonly collection: Readonly<Record<"wood" | "ore", { amount: number; ticks: number }>>;
}
