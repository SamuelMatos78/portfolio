import { parseProgram } from "../src/program.ts";
import { hashProgram } from "../src/serialization.ts";
import { ENGINE_VERSION, RULESET_VERSION } from "../src/rules.ts";
import type { Program, SimulationResult } from "../src/types.ts";
import { MAX_BATTLE_SECONDS } from "./matches.ts";

export class TrainingRequestError extends Error {}

export function parseTrainingRequest(input: unknown): { programA: Program; programB: Program; maxSeconds: number } {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new TrainingRequestError("Envie um objeto JSON com programA e programB.");
  const body = input as Record<string, unknown>;
  for (const key of Object.keys(body)) if (!["programA", "programB", "maxSeconds"].includes(key)) throw new TrainingRequestError(`Campo desconhecido: ${key}.`);
  const maxSeconds = body.maxSeconds === undefined ? MAX_BATTLE_SECONDS : body.maxSeconds;
  if (typeof maxSeconds !== "number" || !Number.isInteger(maxSeconds) || maxSeconds < 1 || maxSeconds > MAX_BATTLE_SECONDS) {
    throw new TrainingRequestError(`maxSeconds deve ser inteiro entre 1 e ${MAX_BATTLE_SECONDS}.`);
  }
  const read = (key: "programA" | "programB"): Program => {
    try {
      const source = typeof body[key] === "string" ? JSON.parse(body[key]) as unknown : body[key];
      return parseProgram(source);
    } catch (error) { throw new TrainingRequestError(`${key}: ${error instanceof Error ? error.message : "Programa inválido."}`); }
  };
  return { programA: read("programA"), programB: read("programB"), maxSeconds };
}

export function trainingResponse(result: SimulationResult, programA: Program, programB: Program, maxSeconds: number) {
  return {
    winner: result.winner, durationSeconds: result.durationSeconds, maxSeconds,
    teams: result.teams, stats: result.stats, eventCount: result.eventCount,
    programHashes: { A: hashProgram(programA), B: hashProgram(programB) },
    engineVersion: ENGINE_VERSION, rulesetVersion: RULESET_VERSION,
  };
}
