import { parseProgram } from "./program.ts";
import type { BattleEvent } from "./types.ts";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(object).sort().map((key) => [key, canonicalize(object[key])]));
  }
  return value;
}

export function canonicalStringify(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function serializeProgram(input: unknown): string {
  return canonicalStringify(parseProgram(input));
}

/** Deterministic 64-bit FNV-1a. This hash is an identifier, not a signature. */
export function stableHash(value: unknown): string {
  const input = typeof value === "string" ? value : canonicalStringify(value);
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

export function hashProgram(input: unknown): string {
  return stableHash(parseProgram(input));
}

export function hashReplay(events: readonly BattleEvent[]): string {
  return stableHash(events);
}
