import type { ProjectCatalog } from "../types/project";
import type { SceneLocation } from "./scenes";
import type { LocalizedText } from "../i18n/types";
import { destinationName, normalizeCommand } from "./commandLanguage.ts";

export function baseDestinations(informationIds: string[]): Map<string, SceneLocation> {
  return new Map<string, SceneLocation>([
    ["home", { id: "home" }], ["projects", { id: "projects" }], ["champions", { id: "champions" }], ["updates", { id: "updates" }],
    ...informationIds.map((id): [string, SceneLocation] => [id, { id: "information", informationId: id }]),
  ]);
}

export function destinationLabels(catalog: ProjectCatalog | null, information: { id: string; title: LocalizedText }[]): Map<string, string> {
  const labels = new Map<string, string>();
  const ambiguous = new Set<string>();
  const add = (id: string, value: LocalizedText) => {
    for (const name of typeof value === "string" ? [value] : [value.pt, value.en]) {
      const label = normalizeCommand(name);
      if (ambiguous.has(label)) continue;
      const existing = labels.get(label);
      if (existing && existing !== id) { labels.delete(label); ambiguous.add(label); continue; }
      labels.set(label, id);
    }
  };
  information.forEach((item) => add(item.id, item.title));
  catalog?.categories.forEach((item) => add(item.id, item.label));
  catalog?.projects.forEach((item) => add(item.id, item.identity.name));
  return labels;
}

export function resolveRegisteredDestination(input: string, registry: Map<string, SceneLocation>, labels: Map<string, string>): SceneLocation | undefined {
  const name = destinationName(input);
  return registry.get(name) ?? registry.get(labels.get(normalizeCommand(name)) ?? "");
}

export function destinationRegistry(catalog: ProjectCatalog, base: Map<string, SceneLocation>): Map<string, SceneLocation> {
  const registry = new Map(base);
  for (const category of catalog.categories) {
    if (category.id === "champions") continue;
    if (registry.has(category.id)) throw new Error(`Destination collision: ${category.id}.`);
    registry.set(category.id, { id: "category", categoryId: category.id });
  }
  for (const project of catalog.projects) {
    if (registry.has(project.id)) throw new Error(`Destination collision: ${project.id}.`);
    registry.set(project.id, { id: "project-experience", projectId: project.id });
  }
  return registry;
}
