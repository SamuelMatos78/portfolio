import { parentPort, workerData } from "node:worker_threads";
import { simulate } from "../src/simulation.ts";
import type { Program } from "../src/types.ts";

const data = workerData as { human: Program; villain: Program; duration: number; debug: boolean };
try {
  const result = simulate(data.human, data.villain, { maxSeconds: data.duration, debug: data.debug, telemetry: "summary" });
  parentPort!.postMessage({ result });
} catch (error) {
  parentPort!.postMessage({ error: error instanceof Error ? error.message : "Falha no confronto." });
}
