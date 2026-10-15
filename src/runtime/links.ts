import { interpretCommand } from "./commands.ts";
import { scenePath } from "./scenes.ts";
import type { SceneLocation } from "./scenes";

export function teleportHref(destination: string): string {
  return `#${new URLSearchParams({ tp: destination })}`;
}

export function commandHref(command: string): string {
  const parsed = interpretCommand(command);
  if (parsed.type !== "tp") throw new Error("A teleport link requires a travel command.");
  return teleportHref(parsed.destination);
}

export function destinationFromURL(input: { hash: string; search: string }): string | undefined {
  const hash = new URLSearchParams(input.hash.slice(1));
  const query = new URLSearchParams(input.search);
  if (hash.has("tp")) return hash.get("tp")?.trim() || "home";
  if (query.has("tp")) return query.get("tp")?.trim() || "home";
  return input.hash ? undefined : "home";
}

export function sceneURL(input: string, scene: SceneLocation): URL {
  const url = new URL(input);
  url.searchParams.delete("tp");
  url.hash = teleportHref(scenePath(scene).slice(2)).slice(1);
  return url;
}
