import { validateSections } from "../projects/validation.ts";
import type { ProjectSection } from "../types/project";

export function validateInformation(value: unknown, ids: string[]): Record<string, ProjectSection[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Information content must be an object.");
  return Object.fromEntries(Object.entries(value).map(([id, sections]) => {
    if (!ids.includes(id)) throw new Error(`Unregistered information destination: ${id}.`);
    return [id, validateSections(sections)];
  }));
}
