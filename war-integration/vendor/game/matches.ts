import { Worker } from "node:worker_threads";
import type { Program, SimulationResult } from "../src/types.ts";

export const MAX_BATTLE_SECONDS = 720;
export const MATCH_TIMEOUT_MS = 720_000;
export const MAX_MATCH_WORKERS = 3;
let activeJobs = 0;

export class ArenaBusyError extends Error {}
export class MatchTimeoutError extends Error {}

export async function runMatch(human: Program, villain: Program, duration: number, debug: boolean): Promise<SimulationResult> {
  if (activeJobs >= MAX_MATCH_WORKERS) throw new ArenaBusyError("A arena já está preparando três partidas. Tente novamente em instantes.");
  activeJobs += 1;
  try {
    return await new Promise<SimulationResult>((resolve, reject) => {
      const worker = new Worker(new URL("./battle-worker.ts", import.meta.url), {
        workerData: { human, villain, duration, debug }, resourceLimits: { maxOldGenerationSizeMb: 512 },
      });
      let settled = false;
      const finish = (error?: Error, result?: SimulationResult) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        void worker.terminate();
        if (error) reject(error); else resolve(result!);
      };
      const timeout = setTimeout(() => finish(new MatchTimeoutError("A preparação excedeu 720 segundos reais. Simplifique os loops do programa e tente de novo.")), MATCH_TIMEOUT_MS);
      worker.once("message", (message: { result?: SimulationResult; error?: string }) => {
        if (message.error) finish(new Error(message.error)); else if (message.result) finish(undefined, message.result);
        else finish(new Error("Resposta inválida da arena."));
      });
      worker.once("error", (error) => finish(error));
      worker.once("exit", (code) => { if (!settled) finish(new Error(`A preparação da partida foi interrompida (${code}).`)); });
    });
  } finally { activeJobs -= 1; }
}
