import type { Ruleset } from "./types.ts";

export const ENGINE_VERSION = "1.3.1";
export const RULESET_VERSION = "1.3.0";

export const RULESET: Ruleset = Object.freeze({
  version: RULESET_VERSION,
  mapSize: 100,
  teamSize: 10,
  tickRate: 14,
  maxSeconds: 180,
  visionRadius: 10,
  combatTicks: 70,
  downedDeathTicks: 420,
  movement: Object.freeze({ normalTicks: 4, carryingTicks: 7 }),
  weapons: Object.freeze({
    sword: Object.freeze({ wood: 2, ore: 4, ticks: 56 }),
    spear: Object.freeze({ wood: 4, ore: 2, ticks: 70 }),
    axe: Object.freeze({ wood: 3, ore: 5, ticks: 84 }),
  }),
  buildings: Object.freeze({
    armory: Object.freeze({ wood: 12, ore: 8, ticks: 168, hp: 3 }),
    hospital: Object.freeze({ wood: 10, ore: 5, ticks: 140, hp: 3 }),
  }),
  collection: Object.freeze({
    wood: Object.freeze({ amount: 3, ticks: 56 }),
    ore: Object.freeze({ amount: 2, ticks: 70 }),
  }),
});

export function secondsToTicks(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError("seconds must be a non-negative finite number");
  const ticks = seconds * RULESET.tickRate;
  if (!Number.isInteger(ticks)) throw new RangeError(`seconds must be an exact multiple of 1/${RULESET.tickRate}`);
  if (!Number.isSafeInteger(ticks)) throw new RangeError("seconds exceeds the supported simulation tick range");
  return ticks;
}

export function ticksToSeconds(ticks: number): number {
  return ticks / RULESET.tickRate;
}
