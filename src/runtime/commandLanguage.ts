import aliases from "../data/commands.json" with { type: "json" };

export function normalizeCommand(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase().replace(/\s+/g, " ");
}

export const travelVerbs = ["tp", "teleportar", "teletransportar", "ir", "go", "cd"] as const;

// A shortcut may also name a destination: "tp campeões" → "champions".
export function destinationName(value: string): string {
  const path = normalizeCommand(value).replace(/^["']|["']$/g, "").replace(/^~?\//, "").replace(/\/$/, "");
  if (!path || path === "~") return "home";
  const alias = aliases.find((alias) => normalizeCommand(alias.command) === path);
  return alias?.target.startsWith("tp ") ? alias.target.slice(3) : path;
}
