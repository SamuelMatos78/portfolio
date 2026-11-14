import { readFile } from "node:fs/promises";
import { parseProgram } from "../src/program.ts";
import { hashProgram } from "../src/serialization.ts";
import type { Program } from "../src/types.ts";
import { starterStrategy } from "./strategies.ts";

export interface Villain {
  id: string;
  name: string;
  title: string;
  description: string;
  color: string;
  hash: string;
  program: Program;
}

export async function loadVillains(): Promise<ReadonlyMap<string, Villain>> {
  const definitions = [
    { id: "claude", name: "Claude", title: "O estrategista", color: "#d99668", file: "claude-sonnet5.5-extra.fixed.json", description: "Economia, diversidade de armas e recuperação. Uma estratégia escrita por Claude." },
    { id: "astra", name: "Astra", title: "A sentinela", color: "#a7a0ed", file: "gpt6-astra-v1.1.min.fixed.json", description: "Patrulhas e escolha de confrontos por equipamento. Uma estratégia escrita por Astra." },
    { id: "gemini", name: "Gemini", title: "O forjador", color: "#67bfc6", file: "gemini3.1-pro-max.fixed.json", description: "Uma abertura econômica com fabricação e avanço. Uma estratégia escrita por Gemini." },
  ];
  const villains = new Map<string, Villain>();
  for (const definition of definitions) {
    const { file, ...metadata } = definition;
    const program = parseProgram(JSON.parse(await readFile(new URL(`../llms/${file}`, import.meta.url), "utf8")));
    villains.set(metadata.id, freezeVillain(metadata, program));
  }
  villains.set("evil-darwin", freezeVillain({ id: "evil-darwin", name: "Evil Darwin", title: "O invasor", color: "#dc694f",
    description: "Build fixa Sentinel 01: coleta, fabrica espadas e avança sobre os humanos. Este adversário não evolui durante o confronto." }, starterStrategy("move_left")));
  return villains;
}

export function freezeVillain(metadata: Omit<Villain, "program" | "hash">, program: Program): Villain {
  const snapshot = structuredClone(program);
  deepFreeze(snapshot);
  return Object.freeze({ ...metadata, program: snapshot, hash: hashProgram(snapshot) });
}

function deepFreeze(value: unknown): void {
  if (value && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
}
