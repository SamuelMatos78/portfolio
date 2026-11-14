import { getBlockDefinition } from "./catalog.ts";
import { RULESET, secondsToTicks, ticksToSeconds } from "./rules.ts";
import { MAX_DECISION_OPERATIONS, parseProgram } from "./program.ts";
import type { BattleEvent, DebugFrame, DebugMarker, Program, ProgramNode, SimulationOptions, SimulationResult, TeamId, TeamStats, WeaponType, Winner } from "./types.ts";

type State = "IDLE" | "MOVING" | "GUARDING" | "COLLECTING" | "BUILDING" | "EQUIPPING" | "HEALING" | "PICKING_UP" | "CARRYING" | "DROPPING" | "ENGAGED" | "INCAPACITATED" | "DEAD";
type BuildingType = "armory" | "hospital";
type ActionKind = "wait" | "collectWood" | "collectOre" | "build" | "equip" | "attackBuilding" | "pickup" | "drop" | "treat" | "recover";
type LoopKind = "while" | "until" | "forever";

interface LoopFrame {
  nodes: ProgramNode[];
  index: number;
  loop?: { kind: LoopKind; node: ProgramNode; parentIndex: number };
}

interface Memory {
  id: string;
  team: TeamId;
  x: number;
  y: number;
  weapon: WeaponType | null;
  downed: boolean;
  carrying: boolean;
  seenAt: number;
}

interface Action {
  kind: ActionKind;
  version: number;
  data: Record<string, unknown>;
}

interface MoveTask {
  version: number;
  kind: "basic" | "path" | "compound";
  stepsRemaining?: number;
  direction?: { x: number; y: number };
  path: Array<{ x: number; y: number }>;
  targetId?: string;
  compoundOp?: number;
  goal?: { x: number; y: number };
  guardAfter?: boolean;
}

interface Unit {
  id: string;
  team: TeamId;
  index: number;
  x: number;
  y: number;
  state: State;
  weapon: WeaponType | null;
  durability: number;
  weaponEquippedAt: number;
  everEquipped: boolean;
  targetId: string | null;
  carryingId: string | null;
  carriedBy: string | null;
  downedAt: number | null;
  deathAt: number | null;
  deathRemainingTicks: number;
  action: Action | null;
  actionVersion: number;
  moveTask: MoveTask | null;
  engagementId: number | null;
  frames: LoopFrame[];
  known: Map<string, Memory>;
}

interface Building {
  id: string;
  team: TeamId;
  type: BuildingType;
  x: number;
  y: number;
  hp: number;
}

interface TeamState {
  wood: number;
  ore: number;
  stats: TeamStats;
  buildReservations: Set<BuildingType>;
}

interface Edge {
  attackerId: string;
  targetId: string;
}

interface Engagement {
  id: number;
  deadline: number;
  version: number;
  participants: Set<string>;
  fighters: Set<string>;
  edges: Edge[];
}

interface Event {
  tick: number;
  type: "move" | "action" | "death" | "decision" | "combat" | "timeout";
  unitId?: string;
  version?: number;
  groupId?: number;
  groupVersion?: number;
  targetId?: string;
  sequence: number;
}

interface ResourceRequest {
  unit: Unit;
  kind: ActionKind;
  data: Record<string, unknown>;
  wood: number;
  ore: number;
  ticks: number;
  reserveBuilding?: BuildingType;
}

export interface Combatant {
  id: string;
  team: TeamId;
  weapon: WeaponType | null;
  weaponEquippedAt: number;
}

export function resolveCombatOutcome(combatants: readonly Combatant[]): Winner {
  const teams: Record<TeamId, Combatant[]> = {
    A: combatants.filter((item) => item.team === "A" && item.weapon !== null),
    B: combatants.filter((item) => item.team === "B" && item.weapon !== null),
  };
  if (teams.A.length === 0 && teams.B.length > 0) return "B";
  if (teams.B.length === 0 && teams.A.length > 0) return "A";
  if (teams.A.length === 0 && teams.B.length === 0) return "DRAW";
  const covers = (team: TeamId, enemy: TeamId): boolean => teams[enemy].every((opponent) =>
    teams[team].some((fighter) => beats(fighter.weapon!, opponent.weapon!)),
  );
  const aCovers = covers("A", "B");
  const bCovers = covers("B", "A");
  if (aCovers && !bCovers) return "A";
  if (bCovers && !aCovers) return "B";
  const allWeapons = [...teams.A, ...teams.B].map((item) => item.weapon);
  if (allWeapons.every((weapon) => weapon === allWeapons[0])) {
    if (teams.A.length > teams.B.length) return "A";
    if (teams.B.length > teams.A.length) return "B";
    if (teams.A.length === 1) {
      if (teams.A[0]!.weaponEquippedAt < teams.B[0]!.weaponEquippedAt) return "A";
      if (teams.B[0]!.weaponEquippedAt < teams.A[0]!.weaponEquippedAt) return "B";
    }
  }
  return "DRAW";
}

function beats(a: WeaponType, b: WeaponType): boolean {
  return (a === "sword" && b === "spear") || (a === "spear" && b === "axe") || (a === "axe" && b === "sword");
}

class EventHeap {
  private values: Event[] = [];
  get size(): number { return this.values.length; }
  peek(): Event | undefined { return this.values[0]; }
  push(event: Event): void {
    this.values.push(event);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (compareEvents(this.values[parent]!, this.values[index]!) <= 0) break;
      [this.values[parent], this.values[index]] = [this.values[index]!, this.values[parent]!];
      index = parent;
    }
  }
  pop(): Event | undefined {
    if (this.values.length === 0) return undefined;
    const root = this.values[0]!;
    const last = this.values.pop()!;
    if (this.values.length > 0) {
      this.values[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.values.length && compareEvents(this.values[left]!, this.values[smallest]!) < 0) smallest = left;
        if (right < this.values.length && compareEvents(this.values[right]!, this.values[smallest]!) < 0) smallest = right;
        if (smallest === index) break;
        [this.values[index], this.values[smallest]] = [this.values[smallest]!, this.values[index]!];
        index = smallest;
      }
    }
    return root;
  }
}

function eventPriority(type: Event["type"]): number {
  return ({ move: 0, action: 1, death: 2, decision: 3, combat: 4, timeout: 5 })[type];
}

function compareEvents(a: Event, b: Event): number {
  return a.tick - b.tick || eventPriority(a.type) - eventPriority(b.type) || a.sequence - b.sequence;
}

const emptyStats = (): TeamStats => ({
  soldiersEquipped: 0, knockdowns: 0, deaths: 0, rescues: 0, captures: 0,
  woodCollected: 0, oreCollected: 0, weaponsCrafted: 0, weaponsBroken: 0,
  buildingsCreated: 0, armoriesBuilt: 0, buildingsDestroyed: 0, durationSeconds: 0,
});

function cellKey(x: number, y: number): string { return `${x},${y}`; }
function manhattan(a: { x: number; y: number }, b: { x: number; y: number }): number { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }
function euclidean(a: { x: number; y: number }, b: { x: number; y: number }): number { return Math.hypot(a.x - b.x, a.y - b.y); }
function teamEnemy(team: TeamId): TeamId { return team === "A" ? "B" : "A"; }
function isWeapon(value: unknown): value is WeaponType { return value === "sword" || value === "spear" || value === "axe"; }
function compare(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case "eq": return value === threshold;
    case "neq": return value !== threshold;
    case "gt": return value > threshold;
    case "gte": return value >= threshold;
    case "lt": return value < threshold;
    case "lte": return value <= threshold;
    default: return false;
  }
}

class Simulation {
  readonly units = new Map<string, Unit>();
  readonly buildings = new Map<string, Building>();
  readonly teams: Record<TeamId, TeamState> = {
    A: { wood: 0, ore: 0, stats: emptyStats(), buildReservations: new Set() },
    B: { wood: 0, ore: 0, stats: emptyStats(), buildReservations: new Set() },
  };
  readonly obstacles: Set<string>;
  readonly events: BattleEvent[] = [];
  readonly debugFrames: DebugFrame[] = [];
  eventCount = 0;
  readonly heap = new EventHeap();
  readonly groups = new Map<number, Engagement>();
  readonly programs: Record<TeamId, Program>;
  readonly telemetry: SimulationOptions["telemetry"];
  readonly debug: boolean;
  readonly maxTicks: number;
  now = 0;
  winner: Winner | null = null;
  private eventSequence = 0;
  private nextGroupId = 1;
  private pendingResources: ResourceRequest[] = [];
  private completionPickups: Event[] = [];
  private completionTreatments: Event[] = [];
  private decisionPathFailures: Set<string> | null = null;
  private decisionVisibleUnits: Map<TeamId, Unit[]> | null = null;
  private decisionVisibleCounts: Map<TeamId, number> | null = null;
  private failedPathWorld = "";
  private failedPaths = new Set<string>();

  constructor(programA: Program, programB: Program, options: SimulationOptions = {}) {
    this.programs = { A: programA, B: programB };
    this.telemetry = options.telemetry ?? "none";
    this.debug = options.debug ?? false;
    const maxSeconds = options.maxSeconds ?? RULESET.maxSeconds;
    const maxTicks = maxSeconds * RULESET.tickRate;
    if (!Number.isFinite(maxSeconds) || maxSeconds < 0 || !Number.isSafeInteger(maxTicks)) {
      throw new RangeError(`maxSeconds must be non-negative and fit the supported tick range.`);
    }
    this.maxTicks = secondsToTicks(maxSeconds);
    const scenarioId = options.scenarioId ?? "default";
    if (!["default", "open", "reference-combat-protection", "reference-combat-duel"].includes(scenarioId)) {
      throw new RangeError(`Unknown scenarioId "${options.scenarioId}".`);
    }
    const obstacleInput = options.obstacles ?? [];
    this.obstacles = new Set();
    for (const obstacle of obstacleInput) {
      if (!Number.isInteger(obstacle.x) || !Number.isInteger(obstacle.y) || obstacle.x < 0 || obstacle.y < 0 || obstacle.x >= RULESET.mapSize || obstacle.y >= RULESET.mapSize) {
        throw new RangeError("Obstacles must be integer coordinates inside the map.");
      }
      this.obstacles.add(cellKey(obstacle.x, obstacle.y));
    }
    this.createUnits();
    if (scenarioId === "reference-combat-protection" || scenarioId === "reference-combat-duel") this.createReferenceCombatFixture(scenarioId === "reference-combat-protection");
  }

  run(): SimulationResult {
    this.record("match-start");
    this.refreshVisibility();
    if (this.debug) this.captureDebugFrame();
    for (const unit of this.units.values()) this.schedule(this.now, "decision", unit.id);
    this.schedule(this.maxTicks, "timeout");
    while (this.heap.size > 0 && this.winner === null) {
      const next = this.heap.peek()!;
      if (next.tick > this.maxTicks) break;
      this.now = next.tick;
      this.processTick();
      this.refreshVisibility();
      this.checkElimination();
      if (this.debug) this.captureDebugFrame();
    }
    if (this.winner === null) this.winner = "DRAW";
    const durationSeconds = ticksToSeconds(this.now);
    this.teams.A.stats.durationSeconds = durationSeconds;
    this.teams.B.stats.durationSeconds = durationSeconds;
    this.record("match-end", undefined, undefined, { winner: this.winner });
    const result: SimulationResult = {
      winner: this.winner,
      durationSeconds,
      stats: { A: structuredClone(this.teams.A.stats), B: structuredClone(this.teams.B.stats) },
      teams: { A: this.finalTeamCounts("A"), B: this.finalTeamCounts("B") },
      eventCount: this.eventCount,
    };
    if (this.telemetry === "replay") result.events = this.events.slice();
    if (this.debug) result.debugFrames = this.debugFrames.slice();
    return result;
  }

  private finalTeamCounts(team: TeamId) {
    const units = [...this.units.values()].filter((unit) => unit.team === team);
    const alive = units.filter((unit) => unit.state !== "DEAD");
    return {
      total: units.length, alive: alive.length,
      active: alive.filter((unit) => unit.state !== "INCAPACITATED").length,
      incapacitated: alive.filter((unit) => unit.state === "INCAPACITATED").length,
      dead: units.length - alive.length,
      armed: alive.filter((unit) => unit.weapon !== null).length,
      unarmed: alive.filter((unit) => unit.weapon === null).length,
    };
  }

  private captureDebugFrame(): void {
    const markers: DebugMarker[] = [];
    for (const team of ["A", "B"] as const) {
      const x = team === "A" ? 20 : 79;
      markers.push({ kind: "forest", team, x, y: 20 });
      markers.push({ kind: "mine", team, x, y: 79 });
    }
    for (const building of this.buildings.values()) {
      markers.push({ kind: building.type, team: building.team, x: building.x, y: building.y, hp: building.hp });
    }
    this.debugFrames.push({
      tick: this.now,
      markers,
      teams: {
        A: { wood: this.teams.A.wood, ore: this.teams.A.ore, stats: { ...this.teams.A.stats } },
        B: { wood: this.teams.B.wood, ore: this.teams.B.ore, stats: { ...this.teams.B.stats } },
      },
      units: [...this.units.values()].map((unit) => ({
        id: unit.id, team: unit.team, x: unit.x, y: unit.y, state: unit.state, weapon: unit.weapon,
        durability: unit.durability, targetId: unit.targetId, carryingId: unit.carryingId,
        carriedBy: unit.carriedBy,
        deathRemainingSeconds: unit.state === "INCAPACITATED"
          ? ticksToSeconds(unit.deathAt === null ? unit.deathRemainingTicks : Math.max(0, unit.deathAt - this.now)) : null,
      })),
    });
  }

  private createUnits(): void {
    for (const team of ["A", "B"] as const) {
      for (let index = 0; index < RULESET.teamSize; index += 1) {
        const x = team === "A" ? 8 : 91;
        const y = 45 + index;
        const unit: Unit = {
          id: `${team}-${index}`, team, index, x, y, state: "IDLE", weapon: null,
          durability: 0, weaponEquippedAt: -1, everEquipped: false, targetId: null, carryingId: null,
          carriedBy: null, downedAt: null, deathAt: null, deathRemainingTicks: 0, action: null, actionVersion: 0,
          moveTask: null, engagementId: null, frames: [{ nodes: this.programs[team].body, index: 0 }], known: new Map(),
        };
        this.units.set(unit.id, unit);
      }
    }
  }

  private createReferenceCombatFixture(withReinforcement: boolean): void {
    const a = this.units.get("A-0")!;
    const b = this.units.get("B-0")!;
    a.x = 50; a.y = 50; a.weapon = "sword"; a.durability = 2; a.weaponEquippedAt = 0; a.everEquipped = true;
    b.x = 51; b.y = 50; b.weapon = "spear"; b.durability = 2; b.weaponEquippedAt = 0; b.everEquipped = true;
    this.teams.A.stats.soldiersEquipped = 1;
    this.teams.B.stats.soldiersEquipped = 1;
    if (withReinforcement) {
      const c = this.units.get("B-1")!;
      c.x = 46; c.y = 50; c.weapon = "axe"; c.durability = 2; c.weaponEquippedAt = 0; c.everEquipped = true;
      this.teams.B.stats.soldiersEquipped += 1;
    }
  }

  private schedule(tick: number, type: Event["type"], unitId?: string, version?: number, groupId?: number, groupVersion?: number, targetId?: string): void {
    this.heap.push({ tick, type, unitId, version, groupId, groupVersion, targetId, sequence: this.eventSequence++ });
  }

  private record(type: string, unit?: Unit, targetId?: string, details?: BattleEvent["details"]): void {
    this.eventCount += 1;
    if (this.telemetry !== "replay") return;
    this.events.push({ tick: this.now, type, team: unit?.team, unitId: unit?.id, targetId, details });
  }

  private processTick(): void {
    let pending: Event[] = [];
    let timeoutReached = false;
    const collect = () => {
      while (this.heap.peek()?.tick === this.now) pending.push(this.heap.pop()!);
      pending.sort(compareEvents);
    };
    collect();
    let phases = 0;
    while (pending.length > 0 && phases++ < 10_000) {
      const moves = pending.filter((event) => event.type === "move");
      pending = pending.filter((event) => event.type !== "move");
      if (moves.length) this.resolveMovementEvents(moves);
      collect();

      const actions = pending.filter((event) => event.type === "action");
      pending = pending.filter((event) => event.type !== "action");
      for (const event of actions) this.completeActionEvent(event);
      this.resolveContestedCompletions();
      collect();

      const deaths = pending.filter((event) => event.type === "death");
      pending = pending.filter((event) => event.type !== "death");
      for (const event of deaths) this.handleDeath(event);

      const decisions = pending.filter((event) => event.type === "decision");
      pending = pending.filter((event) => event.type !== "decision");
      this.pendingResources = [];
      for (const event of decisions) {
        const unit = event.unitId ? this.units.get(event.unitId) : undefined;
        if (unit && this.isAlive(unit) && unit.state !== "ENGAGED" && !unit.action && !unit.moveTask) this.runUnitProgram(unit);
      }
      this.resolveResourceRequests();
      collect();

      // Resolve combat after movement, action completion, and decisions at this tick.
      const combats = pending.filter((event) => event.type === "combat");
      pending = pending.filter((event) => event.type !== "combat");
      for (const event of combats) this.resolveEngagementEvent(event);
      if (pending.some((event) => event.type === "timeout")) timeoutReached = true;
      pending = pending.filter((event) => event.type !== "timeout");
      collect();
    }
    if (timeoutReached && this.winner === null) this.winner = "DRAW";
  }

  private isAlive(unit: Unit): boolean { return unit.state !== "DEAD"; }
  private isActive(unit: Unit): boolean { return unit.state !== "DEAD" && unit.state !== "INCAPACITATED"; }

  private checkElimination(): void {
    const active: Record<TeamId, number> = { A: 0, B: 0 };
    for (const unit of this.units.values()) if (unit.state !== "DEAD" && unit.state !== "INCAPACITATED") active[unit.team] += 1;
    if (active.A === 0 && active.B === 0) this.winner = "DRAW";
    else if (active.A === 0) this.winner = "B";
    else if (active.B === 0) this.winner = "A";
  }

  private refreshVisibility(): void {
    for (const observer of this.units.values()) {
      if (!this.isAlive(observer)) continue;
      for (const target of this.units.values()) {
        if (observer.team === target.team || !this.isAlive(target)) continue;
        if (this.canSee(observer, target)) this.observe(observer, target);
      }
    }
  }

  private canSee(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    if (euclidean(a, b) > RULESET.visionRadius) return false;
    let x0 = a.x, y0 = a.y, x1 = b.x, y1 = b.y;
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let error = dx + dy;
    while (x0 !== x1 || y0 !== y1) {
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x0 += sx; }
      if (twice <= dx) { error += dx; y0 += sy; }
      if ((x0 !== x1 || y0 !== y1) && (this.obstacles.has(cellKey(x0, y0)) || [...this.buildings.values()].some((building) => building.x === x0 && building.y === y0))) return false;
    }
    return true;
  }

  private recordUnitPosition(unit: Unit): void {
    for (const observer of this.units.values()) if (observer.team !== unit.team && this.canSee(observer, unit)) this.observe(observer, unit);
  }

  private observe(observer: Unit, target: Unit): void {
    const next: Memory = {
      id: target.id, team: target.team, x: target.x, y: target.y,
      weapon: target.weapon, downed: target.state === "INCAPACITATED", carrying: !!target.carryingId, seenAt: this.now,
    };
    const previous = observer.known.get(target.id);
    const changed = !previous || previous.x !== next.x || previous.y !== next.y || previous.weapon !== next.weapon || previous.downed !== next.downed || previous.carrying !== next.carrying;
    observer.known.set(target.id, next);
    if (changed) this.record("perception", observer, target.id, { team: target.team, x: target.x, y: target.y, weapon: target.weapon, downed: next.downed, carrying: next.carrying });
  }

  private runUnitProgram(unit: Unit): void {
    // Failed routes can recur hundreds of times in actionless loops. The world
    // cannot move/build/die until this synchronous decision yields. Discard the
    // failures afterwards so the next decision observes all intervening events.
    this.decisionPathFailures = new Set();
    this.decisionVisibleUnits = new Map();
    this.decisionVisibleCounts = new Map();
    try { this.executeUnitProgram(unit); }
    finally { this.decisionPathFailures = null; this.decisionVisibleUnits = null; this.decisionVisibleCounts = null; }
  }

  private executeUnitProgram(unit: Unit): void {
    const program = this.programs[unit.team];
    if (unit.frames.length === 0) unit.frames.push({ nodes: program.body, index: 0 });
    let operations = 0;
    while (operations < MAX_DECISION_OPERATIONS && this.isAlive(unit) && unit.state !== "ENGAGED" && !unit.action && !unit.moveTask) {
      operations += 1;
      if (unit.frames.length === 0) unit.frames.push({ nodes: program.body, index: 0 });
      const frame = unit.frames.at(-1)!;
      if (frame.index >= frame.nodes.length) {
        if (frame.loop) {
          unit.frames.pop();
          const parent = unit.frames.at(-1)!;
          const { kind, node, parentIndex } = frame.loop;
          if (kind === "until" && this.conditionValue(unit, node.condition) === true) parent.index = parentIndex + 1;
          else parent.index = parentIndex;
          continue;
        }
        unit.frames.pop();
        if (unit.frames.length === 0) unit.frames.push({ nodes: program.body, index: 0 });
        continue;
      }
      const node = frame.nodes[frame.index]!;
      const op = node.op;
      if (op === 70) {
        frame.index += 1;
        const branch = this.conditionValue(unit, node.condition) === true ? node.then : node.else;
        if (Array.isArray(branch)) unit.frames.push({ nodes: branch as ProgramNode[], index: 0 });
        continue;
      }
      if (op === 71) {
        frame.index += 1;
        if (Array.isArray(node.body)) unit.frames.push({ nodes: node.body as ProgramNode[], index: 0 });
        continue;
      }
      if (op === 72) {
        unit.frames.push({ nodes: node.body as ProgramNode[], index: 0, loop: { kind: "forever", node, parentIndex: frame.index } });
        continue;
      }
      if (op === 73) {
        unit.frames.push({ nodes: node.body as ProgramNode[], index: 0, loop: { kind: "until", node, parentIndex: frame.index } });
        continue;
      }
      if (op === 74) {
        if (this.conditionValue(unit, node.condition) === true) {
          unit.frames.push({ nodes: node.body as ProgramNode[], index: 0, loop: { kind: "while", node, parentIndex: frame.index } });
        } else frame.index += 1;
        continue;
      }
      if (op === 75 || op === 76) {
        this.applyLoopControl(unit, op === 75 ? "break" : "continue");
        continue;
      }
      if (this.isConditionBlock(op)) {
        frame.index += 1;
        continue;
      }
      const started = this.executeCommand(unit, node);
      frame.index += 1;
      if (started) return;
    }
    if (this.isAlive(unit) && unit.state !== "ENGAGED" && !unit.action && !unit.moveTask) {
      // An actionless loop sleeps one simulated second after its operation budget is exhausted.
      this.schedule(this.now + RULESET.tickRate, "decision", unit.id);
    }
  }

  private applyLoopControl(unit: Unit, signal: "break" | "continue"): void {
    let loopIndex = -1;
    for (let index = unit.frames.length - 1; index >= 0; index -= 1) {
      if (unit.frames[index]!.loop) { loopIndex = index; break; }
    }
    if (loopIndex < 1) {
      const frame = unit.frames.at(-1);
      if (frame) frame.index += 1;
      return;
    }
    const loopFrame = unit.frames[loopIndex]!;
    const parent = unit.frames[loopIndex - 1]!;
    const loop = loopFrame.loop!;
    unit.frames.length = loopIndex;
    if (signal === "break") parent.index = loop.parentIndex + 1;
    else if (loop.kind === "until" && this.conditionValue(unit, loop.node.condition) === true) parent.index = loop.parentIndex + 1;
    else parent.index = loop.parentIndex;
  }

  private isConditionBlock(op: number): boolean {
    return (op >= 50 && op <= 69) || (op >= 103 && op <= 109);
  }

  private conditionValue(unit: Unit, input: unknown): boolean | number {
    if (!input || typeof input !== "object" || !("op" in input)) return false;
    const condition = input as ProgramNode;
    const op = condition.op;
    const target = this.units.get(unit.targetId ?? "");
    const memory = unit.targetId ? unit.known.get(unit.targetId) : undefined;
    const own = this.teams[unit.team];
    const visibleEnemy = () => this.visibleUnits(unit, teamEnemy(unit.team));
    const visibleAlly = () => this.visibleUnits(unit, unit.team);
    const allyCount = () => this.mutuallyVisibleCount(unit, unit.team) - 1;
    const enemyCount = () => this.mutuallyVisibleCount(unit, teamEnemy(unit.team));
    switch (op) {
      case 50: return visibleEnemy().some((candidate) => candidate.state !== "INCAPACITATED");
      case 51: return visibleAlly().some((candidate) => candidate.state === "INCAPACITATED");
      case 52: return unit.weapon === null;
      case 53: return unit.weapon === "sword";
      case 54: return unit.weapon === "spear";
      case 55: return unit.weapon === "axe";
      case 56: return this.findBuilding(unit.team, "armory") !== undefined;
      case 57: return this.findBuilding(unit.team, "hospital") !== undefined;
      case 58: {
        const item = condition.item;
        if (item === "armory") return own.wood >= RULESET.buildings.armory.wood && own.ore >= RULESET.buildings.armory.ore;
        if (item === "hospital") return own.wood >= RULESET.buildings.hospital.wood && own.ore >= RULESET.buildings.hospital.ore;
        if (isWeapon(item)) return own.wood >= RULESET.weapons[item].wood && own.ore >= RULESET.weapons[item].ore;
        return ["sword", "spear", "axe"].some((weapon) => own.wood >= RULESET.weapons[weapon as WeaponType].wood && own.ore >= RULESET.weapons[weapon as WeaponType].ore);
      }
      case 59: return allyCount();
      case 60: return enemyCount();
      case 61: return (!!target && this.isAlive(target) && this.isVisible(unit, target) ? target.weapon : memory?.weapon) === null;
      case 62: return unit.durability === 1;
      case 63: return this.nearArmory(unit);
      case 64: return unit.carryingId !== null;
      case 65: return (!!target && this.isAlive(target) && this.isVisible(unit, target) ? target.weapon : memory?.weapon) === "sword";
      case 66: return (!!target && this.isAlive(target) && this.isVisible(unit, target) ? target.weapon : memory?.weapon) === "spear";
      case 67: return (!!target && this.isAlive(target) && this.isVisible(unit, target) ? target.weapon : memory?.weapon) === "axe";
      case 68: return visibleAlly().some((ally) => ally.weapon !== null && (condition.weapon === undefined || ally.weapon === condition.weapon));
      case 69: return !!target && this.isAlive(target) && this.isVisible(unit, target) ? manhattan(unit, target) <= 1 : !!memory && manhattan(unit, memory) <= 1;
      case 103: return !!target && target.team === unit.team;
      case 104: return !!target && target.team !== unit.team;
      case 105: return !!target && this.isAlive(target) && this.isVisible(unit, target) ? target.state === "INCAPACITATED" : memory?.downed === true;
      case 106: return compare(allyCount(), String(condition.comparator), this.numericValue(unit, condition.value));
      case 107: return compare(enemyCount(), String(condition.comparator), this.numericValue(unit, condition.value));
      case 108: return !!unit.targetId && /^[AB]-(?:armory|hospital)$/.test(unit.targetId);
      case 109: return visibleEnemy().some((candidate) => candidate.state === "INCAPACITATED");
      default: return false;
    }
  }

  private visibleUnits(observer: Unit, team: TeamId): Unit[] {
    const cached = this.decisionVisibleUnits?.get(team);
    if (cached) return cached;
    const visible = [...this.units.values()].filter((target) => target.team === team && target.id !== observer.id && this.isAlive(target) && this.isVisible(observer, target));
    this.decisionVisibleUnits?.set(team, visible);
    return visible;
  }

  private numericValue(unit: Unit, input: unknown): number {
    if (input && typeof input === "object" && "op" in input) {
      const op = Number((input as { op?: unknown }).op);
      if (op === 59) return this.mutuallyVisibleCount(unit, unit.team) - 1;
      if (op === 60) return this.mutuallyVisibleCount(unit, teamEnemy(unit.team));
    }
    return Number(input);
  }

  private isVisible(observer: Unit, target: Unit): boolean { return this.canSee(observer, target); }

  private mutuallyVisibleCount(observer: Unit, team: TeamId): number {
    const cached = this.decisionVisibleCounts?.get(team);
    if (cached !== undefined) return cached;
    const count = [...this.units.values()].filter((candidate) => candidate.team === team && candidate.state !== "DEAD" && candidate.state !== "INCAPACITATED" && this.isVisible(observer, candidate) && this.isVisible(candidate, observer)).length;
    this.decisionVisibleCounts?.set(team, count);
    return count;
  }

  private findBuilding(team: TeamId, type: BuildingType): Building | undefined {
    return [...this.buildings.values()].find((building) => building.team === team && building.type === type);
  }

  private nearArmory(unit: Unit): boolean {
    const building = this.findBuilding(unit.team, "armory");
    return !!building && manhattan(unit, building) <= 2;
  }

  private nearHospital(unit: Unit): boolean {
    const building = this.findBuilding(unit.team, "hospital");
    return !!building && manhattan(unit, building) <= 2;
  }

  private selectNearest(unit: Unit, candidates: Unit[]): Unit | undefined {
    const orientation = unit.team === "A" ? 1 : -1;
    return candidates.sort((a, b) => manhattan(unit, a) - manhattan(unit, b) || a.y - b.y || orientation * (a.x - b.x) || a.index - b.index)[0];
  }

  private nearestKnownUnit(unit: Unit, predicate: (memory: Memory) => boolean): Memory | undefined {
    const orientation = unit.team === "A" ? 1 : -1;
    return [...unit.known.values()].filter(predicate).sort((a, b) => manhattan(unit, a) - manhattan(unit, b) || a.y - b.y || orientation * (a.x - b.x) || a.id.localeCompare(b.id))[0];
  }

  private executeCommand(unit: Unit, node: ProgramNode): boolean {
    const op = node.op;
    if (op === 100) {
      const target = this.selectNearest(unit, this.visibleUnits(unit, teamEnemy(unit.team)).filter((item) => item.state !== "INCAPACITATED"));
      unit.targetId = target?.id ?? null;
      return false;
    }
    if (op === 101) {
      const target = this.selectNearest(unit, this.visibleUnits(unit, unit.team).filter((item) => item.state !== "INCAPACITATED"));
      unit.targetId = target?.id ?? null;
      return false;
    }
    if (op === 102) {
      const candidates = [...this.units.values()].filter((item) => item.state === "INCAPACITATED" && this.isVisible(unit, item));
      const target = this.selectNearest(unit, candidates);
      unit.targetId = target?.id ?? null;
      return false;
    }
    if (op === 10 || op === 11) {
      if (unit.carryingId) return false;
      const type = op === 10 ? "wood" : "ore";
      if (!this.nearResource(unit, type)) return false;
      const data = { resource: type };
      this.beginAction(unit, op === 10 ? "collectWood" : "collectOre", "COLLECTING", data, RULESET.collection[type].ticks);
      return true;
    }
    if (op === 12 || op === 13) {
      if (unit.carryingId) return false;
      const type: BuildingType = op === 12 ? "armory" : "hospital";
      if (!this.nearBuildSite(unit, type)) return false;
      const cost = RULESET.buildings[type];
      this.pendingResources.push({ unit, kind: "build", data: { buildingType: type }, wood: cost.wood, ore: cost.ore, ticks: cost.ticks, reserveBuilding: type });
      return true;
    }
    if (op >= 20 && op <= 23) {
      if (unit.carryingId) return false;
      const weapon: WeaponType | undefined = op === 20 ? "sword" : op === 21 ? "spear" : op === 22 ? "axe" : isWeapon(node.weapon) ? node.weapon : undefined;
      if (!weapon || !this.nearArmory(unit)) return false;
      const cost = RULESET.weapons[weapon];
      this.pendingResources.push({ unit, kind: "equip", data: { weapon }, wood: cost.wood, ore: cost.ore, ticks: cost.ticks });
      return true;
    }
    if (op === 30) return this.startUnitAttack(unit, unit.targetId);
    if (op === 31) {
      if (!isWeapon(node.weapon)) return false;
      const target = this.selectNearest(unit, this.visibleUnits(unit, teamEnemy(unit.team)).filter((candidate) => candidate.weapon === node.weapon && candidate.state !== "INCAPACITATED"));
      if (!target) return false;
      unit.targetId = target.id;
      return this.navigateToTarget(unit, target.x, target.y, 31, target.id);
    }
    if (op === 32) {
      this.cancelCurrentAction(unit);
      unit.state = "GUARDING";
      unit.action = null;
      unit.moveTask = null;
      return true;
    }
    if (op === 33) {
      const target = unit.targetId ? this.units.get(unit.targetId) : this.selectNearest(unit, this.visibleUnits(unit, unit.team).filter((item) => item.id !== unit.id));
      if (!target || target.team !== unit.team) return false;
      return this.navigateToTarget(unit, target.x, target.y, 33, target.id, true);
    }
    if (op === 34) {
      const building = unit.targetId ? this.buildings.get(unit.targetId) : this.findBuilding(unit.team, "armory") ?? this.findBuilding(unit.team, "hospital");
      if (!building || building.team !== unit.team) return false;
      return this.navigateToTarget(unit, building.x, building.y, 34, building.id, true);
    }
    if (op === 35) return this.retreat(unit);
    if (op === 36) return this.startBuildingAttack(unit, unit.targetId);
    if (op === 37) {
      const target = this.chooseEnemyBuilding(unit);
      if (!target) return false;
      unit.targetId = target.id;
      return this.navigateToTarget(unit, target.x, target.y, 37, target.id);
    }
    if (op === 40 || op === 43 || op === 44 || op === 45) {
      const target = this.chooseDownedTarget(unit, op);
      if (!target) return false;
      unit.targetId = target.id;
      if (op === 40) return this.startPickup(unit, target);
      return this.navigateToTarget(unit, target.x, target.y, op, target.id);
    }
    if (op === 41) {
      if (!unit.carryingId) return false;
      this.beginAction(unit, "drop", "DROPPING", { targetId: unit.carryingId }, 14);
      return true;
    }
    if (op === 42) {
      if (unit.carryingId) return false;
      const target = unit.targetId ? this.units.get(unit.targetId) : this.selectNearest(unit, [...this.units.values()].filter((item) => item.team === unit.team && item.state === "INCAPACITATED"));
      if (!target || target.team !== unit.team || target.state !== "INCAPACITATED" || !this.nearHospital(unit) || manhattan(unit, target) > 1) return false;
      this.beginAction(unit, "treat", "HEALING", { targetId: target.id }, 112);
      return true;
    }
    if (op >= 80 && op <= 83) {
      const vectors: Record<number, { x: number; y: number }> = {
        80: { x: 0, y: -1 }, 81: { x: 0, y: 1 }, 82: { x: -1, y: 0 }, 83: { x: 1, y: 0 },
      };
      this.beginBasicMove(unit, vectors[op]!, Number(node.steps ?? 1));
      return true;
    }
    if (op === 84) {
      const target = unit.targetId ? this.units.get(unit.targetId) : undefined;
      const memory = unit.targetId ? unit.known.get(unit.targetId) : undefined;
      if (!target && !memory) return false;
      const point = target && this.isVisible(unit, target) ? target : memory ?? target!;
      this.beginBasicPath(unit, point.x, point.y, Number(node.steps ?? 1));
      return unit.moveTask !== null;
    }
    if (op === 85) return this.goToFacility(unit, "armory");
    if (op === 86) return this.goToFacility(unit, "hospital");
    if (op === 87) return this.goToResource(unit, "wood");
    if (op === 88) return this.goToResource(unit, "ore");
    if (op === 89) {
      const target = this.selectNearest(unit, this.visibleUnits(unit, unit.team).filter((item) => item.id !== unit.id));
      if (!target) return false;
      unit.targetId = target.id;
      return this.navigateToTarget(unit, target.x, target.y, 89, target.id);
    }
    if (op === 90) {
      const target = this.selectNearest(unit, this.visibleUnits(unit, teamEnemy(unit.team)).filter((item) => item.state !== "INCAPACITATED"));
      const memory = target ? undefined : this.nearestKnownUnit(unit, (entry) => entry.team !== unit.team && !entry.downed);
      const chosen = target ?? (memory ? this.units.get(memory.id) : undefined);
      const point = target ?? memory;
      if (!point) return false;
      unit.targetId = chosen?.id ?? memory!.id;
      return this.navigateToTarget(unit, point.x, point.y, 90, unit.targetId);
    }
    if (op === 91) {
      const target = this.chooseDownedTarget(unit, 45);
      if (!target) return false;
      unit.targetId = target.id;
      return this.navigateToTarget(unit, target.x, target.y, 91, target.id);
    }
    if (op === 92) {
      const target = this.chooseEnemyBuilding(unit);
      if (!target) return false;
      unit.targetId = target.id;
      return this.navigateToTarget(unit, target.x, target.y, 92, target.id);
    }
    if (op === 93) {
      if (unit.state === "MOVING") this.cancelCurrentAction(unit);
      unit.state = "IDLE";
      return false;
    }
    if (op === 77) {
      this.beginAction(unit, "wait", "IDLE", {}, Math.max(1, secondsToTicks(Number(node.seconds))));
      return true;
    }
    return false;
  }

  private beginAction(unit: Unit, kind: ActionKind, state: State, data: Record<string, unknown>, duration: number): void {
    unit.actionVersion += 1;
    unit.action = { kind, version: unit.actionVersion, data };
    unit.moveTask = null;
    unit.state = state;
    this.schedule(this.now + duration, "action", unit.id, unit.actionVersion);
    this.record(`action-${kind}-start`, unit, typeof data.targetId === "string" ? data.targetId : undefined);
  }

  private cancelCurrentAction(unit: Unit): void {
    if (unit.action && (unit.action.kind === "build" || unit.action.kind === "equip")) {
      this.teams[unit.team].wood += Number(unit.action.data.reservedWood ?? 0);
      this.teams[unit.team].ore += Number(unit.action.data.reservedOre ?? 0);
      const buildingType = unit.action.data.buildingType;
      if (unit.action.kind === "build" && (buildingType === "armory" || buildingType === "hospital")) this.teams[unit.team].buildReservations.delete(buildingType);
    }
    unit.actionVersion += 1;
    unit.action = null;
    unit.moveTask = null;
    if (unit.state !== "INCAPACITATED" && unit.state !== "DEAD" && unit.state !== "ENGAGED") unit.state = "IDLE";
  }

  private nearResource(unit: Unit, type: "wood" | "ore"): boolean {
    return manhattan(unit, this.resourceSite(unit.team, type)) <= 3;
  }

  private resourceSite(team: TeamId, type: "wood" | "ore"): { x: number; y: number } {
    const x = team === "A" ? 20 : 79;
    return { x, y: type === "wood" ? 20 : 79 };
  }

  private buildSite(team: TeamId, type: BuildingType): { x: number; y: number } {
    return { x: team === "A" ? 10 : 89, y: type === "armory" ? 42 : 57 };
  }

  private buildingCell(team: TeamId, type: BuildingType): { x: number; y: number } {
    return { x: team === "A" ? 11 : 88, y: type === "armory" ? 42 : 57 };
  }

  private nearBuildSite(unit: Unit, type: BuildingType): boolean { return manhattan(unit, this.buildSite(unit.team, type)) <= 1; }

  private resolveResourceRequests(): void {
    for (const team of ["A", "B"] as const) {
      const requests = this.pendingResources.filter((request) => request.unit.team === team && this.isAlive(request.unit));
      if (requests.length === 0) continue;
      const duplicateBuilds = new Set<BuildingType>();
      for (const type of ["armory", "hospital"] as const) {
        const count = requests.filter((request) => request.reserveBuilding === type).length;
        if (count > 1 || this.findBuilding(team, type) || this.teams[team].buildReservations.has(type)) duplicateBuilds.add(type);
      }
      const accepted = requests.filter((request) => !request.reserveBuilding || !duplicateBuilds.has(request.reserveBuilding));
      const state = this.teams[team];
      const totalWood = accepted.reduce((sum, request) => sum + request.wood, 0);
      const totalOre = accepted.reduce((sum, request) => sum + request.ore, 0);
      if (totalWood > state.wood || totalOre > state.ore) {
        for (const request of requests) this.schedule(this.now + 14, "decision", request.unit.id);
        continue;
      }
      state.wood -= totalWood;
      state.ore -= totalOre;
      for (const request of accepted) {
        if (request.reserveBuilding) state.buildReservations.add(request.reserveBuilding);
        const actionKind = request.kind;
        const activity: State = actionKind === "build" ? "BUILDING" : "EQUIPPING";
        this.beginAction(request.unit, actionKind, activity, { ...request.data, reservedWood: request.wood, reservedOre: request.ore }, request.ticks);
      }
      for (const request of requests.filter((candidate) => !accepted.includes(candidate))) this.schedule(this.now + 14, "decision", request.unit.id);
    }
    this.pendingResources = [];
  }

  private beginBasicMove(unit: Unit, direction: { x: number; y: number }, steps: number): void {
    this.beginMoveTask(unit, { kind: "basic", direction, stepsRemaining: steps, path: [] });
  }

  private beginBasicPath(unit: Unit, x: number, y: number, steps: number): void {
    const path = this.findPath(unit, { x, y }, 1);
    if (path.length === 0) return;
    this.beginMoveTask(unit, { kind: "basic", path: path.slice(0, steps) });
  }

  private beginMoveTask(unit: Unit, task: Omit<MoveTask, "version">): void {
    unit.actionVersion += 1;
    const version = unit.actionVersion;
    unit.action = null;
    unit.moveTask = { ...task, version };
    unit.state = unit.carryingId ? "CARRYING" : "MOVING";
    this.schedule(this.now + (unit.carryingId ? RULESET.movement.carryingTicks : RULESET.movement.normalTicks), "move", unit.id, version);
    this.record("move-start", unit);
  }

  private navigateToTarget(unit: Unit, x: number, y: number, op: number, targetId: string, guardAfter = false, adjacency = 1): boolean {
    if (manhattan(unit, { x, y }) <= adjacency) {
      const immediate: MoveTask = { version: unit.actionVersion, kind: "compound", path: [], targetId, compoundOp: op, goal: { x, y }, guardAfter };
      return this.handleCompoundArrival(unit, immediate);
    }
    const path = this.findPath(unit, { x, y }, adjacency);
    if (path.length === 0) return false;
    this.beginMoveTask(unit, { kind: "compound", path, targetId, compoundOp: op, goal: { x, y }, guardAfter });
    return true;
  }

  private goToFacility(unit: Unit, type: BuildingType): boolean {
    const building = this.findBuilding(unit.team, type);
    const point = building ?? this.buildSite(unit.team, type);
    return this.navigateToTarget(unit, point.x, point.y, type === "armory" ? 85 : 86, building?.id ?? `${unit.team}-${type}-site`, false, building ? 2 : 1);
  }

  private goToResource(unit: Unit, type: "wood" | "ore"): boolean {
    const point = this.resourceSite(unit.team, type);
    if (manhattan(unit, point) <= 3) return false;
    const path = this.findPath(unit, point, 3);
    if (path.length === 0) return false;
    this.beginMoveTask(unit, { kind: "compound", path, targetId: `${unit.team}-${type}-site`, compoundOp: type === "wood" ? 87 : 88, goal: point });
    return true;
  }

  private findPath(unit: Unit, target: { x: number; y: number }, adjacency: number): Array<{ x: number; y: number }> {
    const start = { x: unit.x, y: unit.y };
    const goal = (point: { x: number; y: number }) => manhattan(point, target) <= adjacency;
    if (goal(start)) return [];
    const failureKey = `${unit.id}:${start.x},${start.y}:${target.x},${target.y}:${adjacency}`;
    if (this.decisionPathFailures?.has(failureKey)) return [];
    // Path feasibility only depends on occupied cells and static blockers.
    // Reuse failures across decisions while that graph is exactly unchanged.
    const world = [...this.units.values()].filter((other) => other.state !== "DEAD")
      .map((other) => `${other.id}:${other.x},${other.y}`).join("|") + ";"
      + [...this.buildings.values()].map((building) => `${building.id}:${building.x},${building.y}`).join("|");
    if (world !== this.failedPathWorld) {
      this.failedPathWorld = world;
      this.failedPaths.clear();
    }
    if (this.failedPaths.has(failureKey)) {
      this.decisionPathFailures?.add(failureKey);
      return [];
    }
    // Nothing moves during this synchronous search. Snapshot occupancy once,
    // preserving the same blockers without scanning every unit per A* edge.
    const blocked = new Set(this.obstacles);
    for (const building of this.buildings.values()) blocked.add(cellKey(building.x, building.y));
    for (const other of this.units.values()) {
      if (other.id !== unit.id && other.state !== "DEAD") blocked.add(cellKey(other.x, other.y));
    }
    const direct: Array<{ x: number; y: number }> = [];
    let point = start;
    for (let step = 0; step < RULESET.mapSize * 2 && !goal(point); step += 1) {
      const dx = target.x - point.x, dy = target.y - point.y;
      const candidates = [
        ...(Math.abs(dx) >= Math.abs(dy) ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }] : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }]),
      ].filter((dir) => dir.x !== 0 || dir.y !== 0);
      const nextDirection = candidates.find((dir) => {
        const x = point.x + dir.x, y = point.y + dir.y;
        return manhattan({ x, y }, target) < manhattan(point, target)
          && x >= 0 && y >= 0 && x < RULESET.mapSize && y < RULESET.mapSize
          && !blocked.has(cellKey(x, y));
      });
      if (!nextDirection) break;
      point = { x: point.x + nextDirection.x, y: point.y + nextDirection.y };
      direct.push(point);
    }
    if (goal(point)) return direct;
    type SearchNode = { x: number; y: number; g: number; f: number; h: number; order: number };
    const open: SearchNode[] = [];
    let order = 0;
    const less = (a: SearchNode, b: SearchNode) => a.f - b.f || a.h - b.h || a.order - b.order;
    const push = (item: SearchNode) => {
      open.push(item);
      let index = open.length - 1;
      while (index > 0) {
        const parent = Math.floor((index - 1) / 2);
        if (less(open[parent]!, open[index]!) <= 0) break;
        [open[parent], open[index]] = [open[index]!, open[parent]!];
        index = parent;
      }
    };
    const pop = (): SearchNode | undefined => {
      if (!open.length) return undefined;
      const root = open[0]!;
      const tail = open.pop()!;
      if (open.length) {
        open[0] = tail;
        let index = 0;
        while (true) {
          const left = index * 2 + 1, right = left + 1;
          let next = index;
          if (left < open.length && less(open[left]!, open[next]!) < 0) next = left;
          if (right < open.length && less(open[right]!, open[next]!) < 0) next = right;
          if (next === index) break;
          [open[index], open[next]] = [open[next]!, open[index]!];
          index = next;
        }
      }
      return root;
    };
    const startKey = cellKey(start.x, start.y);
    push({ ...start, g: 0, h: manhattan(start, target), f: manhattan(start, target), order: order++ });
    const cameFrom = new Map<string, string | null>([[startKey, null]]);
    const bestCost = new Map<string, number>([[startKey, 0]]);
    let found: string | undefined;
    while (open.length) {
      const current = pop()!;
      const currentKey = cellKey(current.x, current.y);
      if (current.g !== bestCost.get(currentKey)) continue;
      if (goal(current)) { found = currentKey; break; }
      const dx = target.x - current.x, dy = target.y - current.y;
      const horizontal = Math.abs(dx) >= Math.abs(dy);
      const primary = horizontal ? [{ x: Math.sign(dx), y: 0 }, { x: 0, y: Math.sign(dy) }] : [{ x: 0, y: Math.sign(dy) }, { x: Math.sign(dx), y: 0 }];
      const secondary = horizontal ? [{ x: 0, y: Math.sign(dy) }, { x: 0, y: -Math.sign(dy) }, { x: -Math.sign(dx), y: 0 }]
        : [{ x: Math.sign(dx), y: 0 }, { x: -Math.sign(dx), y: 0 }, { x: 0, y: -Math.sign(dy) }];
      const dirs = [...primary, ...secondary].filter((dir) => dir.x !== 0 || dir.y !== 0);
      for (const direction of dirs) {
        const nx = current.x + direction.x, ny = current.y + direction.y;
        const key = cellKey(nx, ny);
        if (nx < 0 || ny < 0 || nx >= RULESET.mapSize || ny >= RULESET.mapSize || blocked.has(key)) continue;
        const g = current.g + 1;
        if (g >= (bestCost.get(key) ?? Infinity)) continue;
        const h = manhattan({ x: nx, y: ny }, target);
        bestCost.set(key, g);
        cameFrom.set(key, currentKey);
        push({ x: nx, y: ny, g, h, f: g + h, order: order++ });
      }
    }
    if (!found) {
      this.decisionPathFailures?.add(failureKey);
      if (this.failedPaths.size >= 4096) this.failedPaths.clear();
      this.failedPaths.add(failureKey);
      return [];
    }
    const result: Array<{ x: number; y: number }> = [];
    let key: string | null = found;
    while (key && key !== cellKey(start.x, start.y)) {
      const [x, y] = key.split(",").map(Number);
      result.push({ x: x!, y: y! });
      key = cameFrom.get(key) ?? null;
    }
    result.reverse();
    return result;
  }

  private isStaticBlocked(x: number, y: number): boolean {
    return this.obstacles.has(cellKey(x, y)) || [...this.buildings.values()].some((building) => building.x === x && building.y === y);
  }

  private occupiedByOther(unitId: string, x: number, y: number): boolean {
    return [...this.units.values()].some((unit) => unit.id !== unitId && unit.x === x && unit.y === y && unit.state !== "DEAD");
  }

  private resolveMovementEvents(events: Event[]): void {
    const candidates = events.map((event) => ({ event, unit: event.unitId ? this.units.get(event.unitId) : undefined }))
      .filter((item): item is { event: Event; unit: Unit } => !!item.unit && item.event.version === item.unit.actionVersion && !!item.unit.moveTask && item.unit.state !== "DEAD" && item.unit.state !== "INCAPACITATED");
    if (candidates.length === 0) return;
    const proposals = new Map<string, { unit: Unit; x: number; y: number }>();
    for (const { unit } of candidates) {
      const task = unit.moveTask!;
      const next = task.path[0] ?? (task.direction ? { x: unit.x + task.direction.x, y: unit.y + task.direction.y } : undefined);
      if (!next || next.x < 0 || next.y < 0 || next.x >= RULESET.mapSize || next.y >= RULESET.mapSize || this.isStaticBlocked(next.x, next.y)) continue;
      proposals.set(unit.id, { unit, ...next });
    }
    const destinationCounts = new Map<string, number>();
    for (const proposal of proposals.values()) {
      const key = cellKey(proposal.x, proposal.y);
      destinationCounts.set(key, (destinationCounts.get(key) ?? 0) + 1);
    }
    const conflicted = new Set<string>();
    for (const proposal of proposals.values()) if (destinationCounts.get(cellKey(proposal.x, proposal.y))! > 1) conflicted.add(proposal.unit.id);
    const canVacate = (id: string, chain: Set<string>): boolean => {
      if (conflicted.has(id) || chain.has(id)) return false;
      const proposal = proposals.get(id);
      if (!proposal) return false;
      chain.add(id);
      const occupant = [...this.units.values()].find((unit) => unit.id !== id && unit.x === proposal.x && unit.y === proposal.y && unit.state !== "DEAD");
      if (!occupant) return true;
      if (!proposals.has(occupant.id)) return false;
      return canVacate(occupant.id, chain);
    };
    const movers = [...proposals.values()].filter((proposal) => canVacate(proposal.unit.id, new Set()));
    for (const mover of movers) { mover.unit.x = mover.x; mover.unit.y = mover.y; }
    for (const mover of movers) {
      const unit = mover.unit;
      const task = unit.moveTask;
      this.record("move-step", unit, undefined, { x: unit.x, y: unit.y });
      if (unit.carryingId) {
        const carried = this.units.get(unit.carryingId);
        if (carried) { carried.x = unit.x; carried.y = unit.y; }
      }
      this.recordUnitPosition(unit);
      // Positions were applied simultaneously above. An earlier arrival can
      // initiate combat and cancel this mover's task before its turn here.
      // Preserve the physical move/telemetry, but never advance a canceled task.
      if (!task) continue;
      if (task.path.length > 0) task.path.shift();
      else if (task.stepsRemaining !== undefined) task.stepsRemaining -= 1;
      const remaining = task.path.length > 0 || (task.stepsRemaining !== undefined && task.stepsRemaining > 0);
      if (remaining) this.schedule(this.now + (unit.carryingId ? RULESET.movement.carryingTicks : RULESET.movement.normalTicks), "move", unit.id, task.version);
      else this.finishMove(unit);
    }
    for (const { unit } of candidates) {
      if (movers.some((mover) => mover.unit.id === unit.id)) continue;
      const task = unit.moveTask;
      if (!task) continue;
      if (task.kind === "compound" && task.goal && task.compoundOp !== undefined) {
        const path = this.findPath(unit, task.goal, 1);
        if (path.length > 0) { task.path = path; this.schedule(this.now + (unit.carryingId ? RULESET.movement.carryingTicks : RULESET.movement.normalTicks), "move", unit.id, task.version); }
        else this.finishMove(unit);
      } else this.finishMove(unit);
    }
  }

  private finishMove(unit: Unit): void {
    const task = unit.moveTask;
    if (!task) return;
    if (task.kind === "compound") {
      const started = this.handleCompoundArrival(unit, task);
      if (started) return;
    }
    unit.actionVersion += 1;
    unit.moveTask = null;
    unit.state = unit.carryingId ? "CARRYING" : "IDLE";
    this.schedule(this.now, "decision", unit.id);
  }

  private handleCompoundArrival(unit: Unit, task: MoveTask): boolean {
    const op = task.compoundOp;
    const target = task.targetId ? this.units.get(task.targetId) : undefined;
    const building = task.targetId ? this.buildings.get(task.targetId) : undefined;
    if (op === 31) {
      if (target && target.state !== "INCAPACITATED" && target.state !== "DEAD" && manhattan(unit, target) <= 1) return this.startUnitAttack(unit, target.id);
      if (task.goal && target && target.state !== "DEAD" && this.isVisible(unit, target)) {
        const path = this.findPath(unit, { x: target.x, y: target.y }, 1);
        if (path.length > 0) { task.path = path; this.schedule(this.now + 8, "move", unit.id, task.version); return true; }
      }
      return false;
    }
    if (op === 37) {
      if (building && manhattan(unit, building) <= 1) return this.startBuildingAttack(unit, building.id);
      return false;
    }
    if (op === 43 || op === 44 || op === 45) {
      if (target && target.state === "INCAPACITATED" && manhattan(unit, target) <= 1) return this.startPickup(unit, target);
      return false;
    }
    if (task.guardAfter) {
      unit.actionVersion += 1;
      unit.moveTask = null;
      unit.state = "GUARDING";
      return true;
    }
    if ([85, 86].includes(op ?? 0) && !building) {
      // The reserved point is a navigation destination only; it does not create a facility.
    }
    return false;
  }

  private retreat(unit: Unit): boolean {
    const enemies = this.visibleUnits(unit, teamEnemy(unit.team)).filter((enemy) => enemy.state !== "INCAPACITATED");
    if (enemies.length === 0) return false;
    const candidates = [
      { x: unit.x, y: unit.y - 1 }, { x: unit.x, y: unit.y + 1 },
      { x: unit.x - 1, y: unit.y }, { x: unit.x + 1, y: unit.y },
    ].filter((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < RULESET.mapSize && cell.y < RULESET.mapSize && !this.isStaticBlocked(cell.x, cell.y) && !this.occupiedByOther(unit.id, cell.x, cell.y));
    const orientation = unit.team === "A" ? 1 : -1;
    candidates.sort((a, b) => Math.min(...enemies.map((enemy) => manhattan(b, enemy))) - Math.min(...enemies.map((enemy) => manhattan(a, enemy))) || a.y - b.y || orientation * (a.x - b.x));
    const destination = candidates[0];
    if (!destination) return false;
    this.beginMoveTask(unit, { kind: "basic", path: [destination] });
    return true;
  }

  private startUnitAttack(attacker: Unit, targetId: string | null): boolean {
    if (!targetId || !attacker.weapon || attacker.carryingId || !this.isAlive(attacker)) return false;
    const target = this.units.get(targetId);
    if (!target || target.team === attacker.team || target.state === "INCAPACITATED" || target.state === "DEAD" || manhattan(attacker, target) !== 1 || !this.canSee(attacker, target)) return false;
    if (attacker.state !== "IDLE" && attacker.state !== "MOVING" && attacker.state !== "GUARDING" && attacker.state !== "ENGAGED") return false;
    this.cancelCurrentAction(attacker);
    const existing = new Set<number>();
    if (attacker.engagementId !== null) existing.add(attacker.engagementId);
    if (target.engagementId !== null) existing.add(target.engagementId);
    let group: Engagement;
    if (existing.size === 0) {
      group = { id: this.nextGroupId++, deadline: this.now + RULESET.combatTicks, version: 1, participants: new Set(), fighters: new Set(), edges: [] };
    } else {
      const groups = [...existing].map((id) => this.groups.get(id)).filter((item): item is Engagement => !!item);
      group = groups.sort((a, b) => a.id - b.id)[0]!;
      group.deadline = Math.min(this.now + RULESET.combatTicks, ...groups.map((item) => item.deadline));
      for (const extra of groups.slice(1)) {
        for (const participant of extra.participants) group.participants.add(participant);
        for (const fighter of extra.fighters) group.fighters.add(fighter);
        group.edges.push(...extra.edges);
        this.groups.delete(extra.id);
      }
      group.version += 1;
    }
    this.groups.set(group.id, group);
    const add = (unit: Unit) => {
      const wasParticipant = group.participants.has(unit.id);
      const wasCombatReady = ["IDLE", "MOVING", "GUARDING", "ENGAGED"].includes(unit.state) && !!unit.weapon && !unit.carryingId;
      if (wasCombatReady) group.fighters.add(unit.id);
      group.participants.add(unit.id);
      unit.engagementId = group.id;
      if (!wasParticipant) this.cancelCurrentAction(unit);
      unit.state = "ENGAGED";
    };
    add(attacker);
    add(target);
    if (attacker.weapon) group.fighters.add(attacker.id);
    group.edges.push({ attackerId: attacker.id, targetId: target.id });
    for (const participantId of group.participants) {
      const participant = this.units.get(participantId);
      if (participant) participant.engagementId = group.id;
    }
    this.schedule(group.deadline, "combat", undefined, undefined, group.id, group.version);
    this.record("engagement-join", attacker, target.id, { deadline: group.deadline });
    return true;
  }

  private startBuildingAttack(attacker: Unit, buildingId: string | null): boolean {
    if (!buildingId || !this.isAlive(attacker) || attacker.carryingId || (attacker.state !== "IDLE" && attacker.state !== "MOVING" && attacker.state !== "GUARDING")) return false;
    const building = this.buildings.get(buildingId);
    if (!building || building.team === attacker.team || manhattan(attacker, building) !== 1 || !this.canSee(attacker, building)) return false;
    this.beginAction(attacker, "attackBuilding", "ENGAGED", { buildingId }, 42);
    return true;
  }

  private startPickup(carrier: Unit, target: Unit): boolean {
    if (!this.isAlive(carrier) || carrier.carryingId || target.state !== "INCAPACITATED" || target.carriedBy || manhattan(carrier, target) > 1 || carrier.state === "ENGAGED") return false;
    this.beginAction(carrier, "pickup", "PICKING_UP", { targetId: target.id }, 28);
    return true;
  }

  private chooseDownedTarget(unit: Unit, op: number): Unit | undefined {
    const candidates = [...this.units.values()].filter((candidate) => {
      if (candidate.state !== "INCAPACITATED" || candidate.carriedBy) return false;
      if (op === 43 && candidate.team !== unit.team) return false;
      if (op === 44 && candidate.team === unit.team) return false;
      return this.isVisible(unit, candidate);
    });
    return this.selectNearest(unit, candidates);
  }

  private chooseEnemyBuilding(unit: Unit): Building | undefined {
    const orientation = unit.team === "A" ? 1 : -1;
    return [...this.buildings.values()].filter((building) => building.team !== unit.team && this.canSee(unit, building))
      .sort((a, b) => manhattan(unit, a) - manhattan(unit, b) || a.y - b.y || orientation * (a.x - b.x) || a.id.localeCompare(b.id))[0];
  }

  private canSeeBuilding(unit: Unit, building: Building): boolean { return this.canSee(unit, building); }

  private completeActionEvent(event: Event): void {
    const unit = event.unitId ? this.units.get(event.unitId) : undefined;
    if (!unit || !unit.action || unit.action.version !== event.version || !this.isAlive(unit)) return;
    const action = unit.action;
    if (action.kind === "pickup") { this.completionPickups.push(event); return; }
    if (action.kind === "treat") { this.completionTreatments.push(event); return; }
    if (action.kind === "wait") { this.finishAction(unit); return; }
    if (action.kind === "collectWood") {
      this.teams[unit.team].wood += RULESET.collection.wood.amount;
      this.teams[unit.team].stats.woodCollected += RULESET.collection.wood.amount;
      this.record("wood-collected", unit);
    } else if (action.kind === "collectOre") {
      this.teams[unit.team].ore += RULESET.collection.ore.amount;
      this.teams[unit.team].stats.oreCollected += RULESET.collection.ore.amount;
      this.record("ore-collected", unit);
    } else if (action.kind === "build") {
      const type = action.data.buildingType as BuildingType;
      const place = this.buildingCell(unit.team, type);
      const building: Building = { id: `${unit.team}-${type}`, team: unit.team, type, ...place, hp: RULESET.buildings[type].hp };
      this.buildings.set(building.id, building);
      this.teams[unit.team].buildReservations.delete(type);
      this.teams[unit.team].stats.buildingsCreated += 1;
      if (type === "armory") this.teams[unit.team].stats.armoriesBuilt += 1;
      this.record("building-created", unit, building.id, { type });
    } else if (action.kind === "equip") {
      const weapon = action.data.weapon as WeaponType;
      if (!unit.everEquipped) this.teams[unit.team].stats.soldiersEquipped += 1;
      unit.everEquipped = true;
      unit.weapon = weapon;
      unit.durability = 2;
      unit.weaponEquippedAt = this.now;
      this.teams[unit.team].stats.weaponsCrafted += 1;
      this.record("weapon-equipped", unit, undefined, { weapon, durability: 2 });
    } else if (action.kind === "attackBuilding") {
      const building = this.buildings.get(String(action.data.buildingId));
      if (building && building.team !== unit.team && manhattan(unit, building) === 1) {
        building.hp -= 1;
        this.record("building-damaged", unit, building.id, { hp: building.hp });
        if (building.hp <= 0) {
          this.buildings.delete(building.id);
          this.teams[unit.team].stats.buildingsDestroyed += 1;
          this.record("building-destroyed", unit, building.id);
        }
      }
    } else if (action.kind === "drop") {
      this.dropCarried(unit);
    } else if (action.kind === "recover") {
      const patient = this.units.get(String(action.data.targetId));
      if (patient && patient.team === unit.team && patient.state === "INCAPACITATED" && this.nearHospital(unit) && manhattan(unit, patient) <= 1) {
        patient.state = "IDLE";
        patient.downedAt = null;
        patient.deathAt = null;
        patient.deathRemainingTicks = 0;
        patient.carriedBy = null;
        patient.x = unit.x;
        patient.y = unit.y;
        const carrier = [...this.units.values()].find((item) => item.carryingId === patient.id);
        if (carrier) {
          carrier.carryingId = null;
          if (carrier.state === "CARRYING") { carrier.state = "IDLE"; this.schedule(this.now, "decision", carrier.id); }
        }
        this.teams[unit.team].stats.rescues += 1;
        this.record("soldier-recovered", unit, patient.id);
      }
    }
    this.finishAction(unit);
  }

  private resolveContestedCompletions(): void {
    for (const [events, label] of [[this.completionPickups, "pickup"], [this.completionTreatments, "treat"]] as const) {
      const groups = new Map<string, Event[]>();
      for (const event of events) {
        const unit = event.unitId ? this.units.get(event.unitId) : undefined;
        const targetId = unit?.action?.data.targetId;
        if (typeof targetId !== "string") continue;
        const list = groups.get(targetId) ?? [];
        list.push(event); groups.set(targetId, list);
      }
      for (const [targetId, group] of groups) {
        if (group.length !== 1) {
          for (const event of group) { const unit = this.units.get(event.unitId!); if (unit) this.finishAction(unit); }
          continue;
        }
        const event = group[0]!;
        const unit = this.units.get(event.unitId!);
        const target = this.units.get(targetId);
        if (!unit || !target || !unit.action || unit.action.version !== event.version) continue;
        if (label === "pickup") {
          if (target.state !== "INCAPACITATED" || target.carriedBy || manhattan(unit, target) > 1) { this.finishAction(unit); continue; }
          unit.carryingId = target.id;
          target.carriedBy = unit.id;
          target.deathRemainingTicks = target.deathAt === null ? target.deathRemainingTicks : Math.max(0, target.deathAt - this.now);
          target.deathAt = null;
          target.x = unit.x; target.y = unit.y;
          unit.state = "CARRYING";
          unit.action = null;
          unit.moveTask = null;
          if (target.team !== unit.team) this.teams[unit.team].stats.captures += 1;
          this.record("soldier-picked-up", unit, target.id);
          this.schedule(this.now, "decision", unit.id);
        } else {
          if (target.state !== "INCAPACITATED" || target.team !== unit.team || !this.nearHospital(unit) || manhattan(unit, target) > 1) { this.finishAction(unit); continue; }
          this.finishAction(unit);
          this.beginAction(unit, "recover", "HEALING", { targetId: target.id }, 28);
        }
      }
      events.length = 0;
    }
  }

  private finishAction(unit: Unit): void {
    unit.actionVersion += 1;
    unit.action = null;
    unit.moveTask = null;
    if (unit.state !== "INCAPACITATED" && unit.state !== "DEAD" && !(unit.state === "ENGAGED" && unit.engagementId !== null)) unit.state = unit.carryingId ? "CARRYING" : "IDLE";
    if (unit.state !== "ENGAGED" && unit.state !== "INCAPACITATED" && unit.state !== "DEAD") this.schedule(this.now, "decision", unit.id);
  }

  private dropCarried(carrier: Unit): void {
    const target = carrier.carryingId ? this.units.get(carrier.carryingId) : undefined;
    if (!target) { carrier.carryingId = null; return; }
    target.carriedBy = null;
    if (target.state === "INCAPACITATED") {
      target.deathAt = this.now + target.deathRemainingTicks;
      this.schedule(target.deathAt, "death", target.id);
    }
    const open = this.findDropCell(carrier);
    target.x = open.x; target.y = open.y;
    carrier.carryingId = null;
    this.record("soldier-dropped", carrier, target.id);
  }

  private findDropCell(unit: Unit): { x: number; y: number } {
    const candidates = [{ x: unit.x, y: unit.y }, { x: unit.x, y: unit.y - 1 }, { x: unit.x + 1, y: unit.y }, { x: unit.x, y: unit.y + 1 }, { x: unit.x - 1, y: unit.y }];
    return candidates.find((cell) => cell.x >= 0 && cell.y >= 0 && cell.x < RULESET.mapSize && cell.y < RULESET.mapSize && !this.isStaticBlocked(cell.x, cell.y) && !this.occupiedByOther(unit.id, cell.x, cell.y)) ?? { x: unit.x, y: unit.y };
  }

  private handleDeath(event: Event): void {
    const unit = event.unitId ? this.units.get(event.unitId) : undefined;
    if (!unit || unit.state !== "INCAPACITATED" || unit.carriedBy || unit.deathAt === null || this.now < unit.deathAt) return;
    unit.carriedBy = null;
    unit.state = "DEAD";
    unit.downedAt = null;
    unit.deathAt = null;
    unit.deathRemainingTicks = 0;
    this.teams[unit.team].stats.deaths += 1;
    this.record("soldier-died", unit);
  }

  private resolveEngagementEvent(event: Event): void {
    if (event.groupId === undefined) return;
    const group = this.groups.get(event.groupId);
    if (!group || group.version !== event.groupVersion || this.now < group.deadline) return;
    this.groups.delete(group.id);
    const participants = [...group.participants].map((id) => this.units.get(id)).filter((unit): unit is Unit => !!unit && unit.state !== "DEAD" && unit.state !== "INCAPACITATED");
    const fighters = [...group.fighters].map((id) => this.units.get(id)).filter((unit): unit is Unit => !!unit && unit.state !== "DEAD" && unit.state !== "INCAPACITATED" && unit.weapon !== null);
    const winner = resolveCombatOutcome(fighters.map((unit) => ({ id: unit.id, team: unit.team, weapon: unit.weapon, weaponEquippedAt: unit.weaponEquippedAt })));
    const armedAtResolution = new Map<string, WeaponType | null>(participants.map((unit) => [unit.id, unit.weapon] as const));
    for (const unit of participants) {
      unit.engagementId = null;
      if (unit.action?.kind === "attackBuilding") this.cancelCurrentAction(unit);
    }
    if (winner === "DRAW") {
      this.recoil(fighters);
      for (const unit of participants) {
        if (unit.state === "ENGAGED") { unit.state = unit.carryingId ? "CARRYING" : "IDLE"; this.schedule(this.now, "decision", unit.id); }
      }
      this.record("engagement-draw", undefined, undefined, { participants: participants.length });
      return;
    }
    const victims = participants.filter((unit) => unit.team !== winner);
    const winners = participants.filter((unit) => unit.team === winner);
    for (const victim of victims) this.knockDown(victim);
    this.assignWeaponWear(group, winner, victims, fighters, armedAtResolution);
    for (const unit of winners) {
      if (unit.state === "ENGAGED") {
        unit.state = unit.carryingId ? "CARRYING" : "IDLE";
        this.schedule(this.now, "decision", unit.id);
      }
    }
    this.record("engagement-resolved", undefined, undefined, { winner, participants: participants.length, fighters: fighters.length });
  }

  private knockDown(unit: Unit): void {
    if (unit.state === "DEAD" || unit.state === "INCAPACITATED") return;
    if (unit.carryingId) this.dropCarried(unit);
    this.cancelCurrentAction(unit);
    unit.engagementId = null;
    unit.state = "INCAPACITATED";
    unit.downedAt = this.now;
    unit.deathRemainingTicks = RULESET.downedDeathTicks;
    unit.deathAt = this.now + RULESET.downedDeathTicks;
    this.teams[unit.team].stats.knockdowns += 1;
    this.schedule(this.now + RULESET.downedDeathTicks, "death", unit.id);
    this.record("soldier-downed", unit);
  }

  private assignWeaponWear(group: Engagement, winner: TeamId, victims: Unit[], fighters: Unit[], weaponSnapshot: Map<string, WeaponType | null>): void {
    for (const victim of victims) {
      const victimWeapon = weaponSnapshot.get(victim.id);
      if (!victimWeapon) continue;
      const eligible = fighters.filter((fighter) => fighter.team === winner && fighter.weapon !== null && beats(fighter.weapon, victimWeapon));
      const direct = group.edges.filter((edge) => edge.targetId === victim.id).map((edge) => this.units.get(edge.attackerId)).filter((fighter): fighter is Unit => !!fighter && fighter.team === winner && fighter.weapon !== null);
      const candidates = (eligible.length ? eligible : direct).sort((a, b) => a.index - b.index || a.y - b.y || a.x - b.x);
      const credit = candidates[0];
      if (!credit) continue;
      credit.durability -= 1;
      if (credit.durability <= 0) {
        credit.weapon = null;
        credit.durability = 0;
        this.teams[winner].stats.weaponsBroken += 1;
        this.record("weapon-broken", credit);
      }
    }
  }

  private recoil(fighters: Unit[]): void {
    for (let step = 0; step < 2; step += 1) {
      const proposals = new Map<string, { unit: Unit; x: number; y: number }>();
      for (const unit of fighters) {
        const enemies = fighters.filter((candidate) => candidate.team !== unit.team);
        if (enemies.length === 0) continue;
        const orientation = unit.team === "A" ? 1 : -1;
        const nearest = enemies.sort((a, b) => manhattan(unit, a) - manhattan(unit, b) || a.y - b.y || orientation * (a.x - b.x))[0]!;
        const dx = unit.x - nearest.x, dy = unit.y - nearest.y;
        const direction = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx) || (unit.team === "A" ? -1 : 1), y: 0 } : { x: 0, y: Math.sign(dy) };
        const x = unit.x + direction.x, y = unit.y + direction.y;
        if (x >= 0 && y >= 0 && x < RULESET.mapSize && y < RULESET.mapSize && !this.isStaticBlocked(x, y)) proposals.set(unit.id, { unit, x, y });
      }
      const counts = new Map<string, number>();
      for (const proposal of proposals.values()) counts.set(cellKey(proposal.x, proposal.y), (counts.get(cellKey(proposal.x, proposal.y)) ?? 0) + 1);
      const moves = [...proposals.values()].filter((proposal) => counts.get(cellKey(proposal.x, proposal.y)) === 1 && !this.occupiedByOther(proposal.unit.id, proposal.x, proposal.y));
      for (const proposal of moves) { proposal.unit.x = proposal.x; proposal.unit.y = proposal.y; }
    }
  }
}

export function simulate(programA: Program, programB: Program, options: SimulationOptions = {}): SimulationResult {
  const normalizedA = parseProgram(programA);
  const normalizedB = parseProgram(programB);
  return new Simulation(normalizedA, normalizedB, options).run();
}






