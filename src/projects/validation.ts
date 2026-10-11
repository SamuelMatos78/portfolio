import type { ProjectCatalog, ProjectManifest, ProjectSection, ProjectPresentation } from "../types/project";
import type { LocalizedText } from "../i18n/types";

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as Record<string, unknown>;
}
function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value;
}
function string(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a nonempty string.`);
  return value;
}
function optionalString(value: unknown, field: string): string | undefined {
  return value === undefined ? undefined : string(value, field);
}
function text(value: unknown, field: string): LocalizedText {
  if (typeof value === "string") return string(value, field);
  const item = record(value, field);
  return { pt: string(item.pt, `${field}.pt`), en: string(item.en, `${field}.en`) };
}
function optionalText(value: unknown, field: string): LocalizedText | undefined {
  return value === undefined ? undefined : text(value, field);
}
function option<T extends string>(value: unknown, choices: readonly T[], field: string): T {
  const result = string(value, field);
  if (!choices.includes(result as T)) throw new Error(`${field}: expected ${choices.join(" / ")}.`);
  return result as T;
}
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} must be boolean.`);
  return value;
}
function number(value: unknown, min: number, max: number, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}
function id(value: unknown): string {
  const result = string(value, "id");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) throw new Error(`Invalid destination id: ${result}.`);
  return result;
}
function identity(value: unknown) {
  const item = record(value, "identity");
  return {
    name: string(item.name, "identity.name"),
    subtitle: text(item.subtitle, "identity.subtitle"),
    status: text(item.status, "identity.status"),
  };
}
function unique(values: string[], field: string) {
  if (new Set(values).size !== values.length) throw new Error(`Duplicate ${field}.`);
}

export function validatePresentation(value: unknown): ProjectPresentation | undefined {
  if (value === undefined) return undefined;
  const item = record(value, "presentation");
  const result: ProjectPresentation = {};
  if (item.tone !== undefined) result.tone = option(item.tone, ["intimidating", "neutral", "humanitarian"] as const, "presentation.tone");
  if (item.icon !== undefined) {
    const icon = string(item.icon, "presentation.icon");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(icon)) throw new Error("presentation.icon must be an SVG filename without its extension.");
    result.icon = icon;
  }
  if (item.secondaryAccent !== undefined) result.secondaryAccent = string(item.secondaryAccent, "presentation.secondaryAccent");
  if (item.imageFit !== undefined) result.imageFit = option(item.imageFit, ["cover", "contain"] as const, "presentation.imageFit");
  if (item.imagePosition !== undefined) result.imagePosition = string(item.imagePosition, "presentation.imagePosition");
  return result;
}

export function validateCatalog(value: unknown): ProjectCatalog {
  const data = record(value, "catalog");
  const categories = list(data.categories, "categories").map((value) => {
    const item = record(value, "category");
    const visual = record(item.visual, "category.visual");
    return {
      id: id(item.id), label: text(item.label, "category.label"),
      description: text(item.description, "category.description"),
      command: string(item.command, "category.command"),
      visual: { accent: string(visual.accent, "visual.accent"), symbol: string(visual.symbol, "visual.symbol"), icon: optionalString(visual.icon, "visual.icon"), tone: option(visual.tone ?? "neutral", ["intimidating", "neutral", "humanitarian"] as const, "visual.tone") },
    };
  });
  const projects = list(data.projects, "projects").map((value) => {
    const item = record(value, "project");
    const hall = record(item.hall, "hall");
    const category = string(item.category, "project.category");
    if (!categories.some((entry) => entry.id === category)) throw new Error(`Unregistered category: ${category}.`);
    return {
      id: id(item.id), manifest: string(item.manifest, "manifest"), category,
      featured: boolean(item.featured, "featured"), identity: identity(item.identity),
      presentation: validatePresentation(item.presentation),
      command: string(item.command, "project.command"),
      hall: {
        image: optionalString(hall.image, "hall.image"), accent: string(hall.accent, "hall.accent"),
        hoverText: text(hall.hoverText, "hall.hoverText"),
        hoverEffect: option(hall.hoverEffect, ["scan", "pulse", "lift", "none"] as const, "hall.hoverEffect"),
      },
    };
  });
  unique(categories.map((category) => category.id), "category id");
  unique(projects.map((project) => project.id), "project id");
  const updates = list(data.updates ?? [], "updates").map((value) => {
    const item = record(value, "update");
    const date = string(item.date, "update.date");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error("Update date must be a valid YYYY-MM-DD date.");
    const projectId = optionalString(item.projectId, "update.projectId");
    if (projectId && !projects.some((project) => project.id === projectId)) throw new Error(`Unregistered update project: ${projectId}.`);
    return { id: id(item.id), date, projectId, title: text(item.title, "update.title"), body: text(item.body, "update.body"), command: optionalString(item.command, "update.command") };
  });
  unique(updates.map((update) => update.id), "update id");
  return { categories, projects, updates: updates.sort((a, b) => b.date.localeCompare(a.date)) };
}

function section(value: unknown): ProjectSection {
  const item = record(value, "section");
  const title = text(item.title, "section.title");
  switch (item.type) {
    case "hero": return {
      type: "hero", title, description: text(item.description, "hero.description"),
      eyebrow: optionalText(item.eyebrow, "hero.eyebrow"), image: optionalString(item.image, "hero.image"),
    };
    case "text": return { type: "text", title, body: text(item.body, "text.body") };
    case "stats": return {
      type: "stats", title, items: list(item.items, "stats.items").map((value) => {
        const stat = record(value, "stat");
        return { label: text(stat.label, "stat.label"), value: text(stat.value, "stat.value"), note: optionalText(stat.note, "stat.note") };
      }),
    };
    case "gallery": return {
      type: "gallery", title, items: list(item.items, "gallery.items").map((value) => {
        const image = record(value, "gallery item");
        return { caption: text(image.caption, "gallery.caption"), alt: text(image.alt, "gallery.alt"), image: optionalString(image.image, "gallery.image") };
      }),
    };
    case "links": return {
      type: "links", title, items: list(item.items, "links.items").map((value) => {
        const link = record(value, "link");
        const href = optionalString(link.href, "link.href");
        if (href && !/^https?:\/\/[^\s]+$/i.test(href)) throw new Error("Link href must be an absolute HTTP(S) URL.");
        return { label: text(link.label, "link.label"), href, note: optionalText(link.note, "link.note") };
      }),
    };
    default: throw new Error(`Unsupported section type: ${String(item.type)}.`);
  }
}

export function validateSections(value: unknown): ProjectSection[] {
  return list(value, "sections").map(section);
}

export function validateManifest(value: unknown, expectedId: string): ProjectManifest {
  const data = record(value, "manifest");
  if (id(data.id) !== expectedId) throw new Error("Manifest id does not match its catalog registration.");
  const visual = record(data.visual, "visual");
  const entrance = record(data.entrance, "entrance");
  return {
    id: expectedId, identity: identity(data.identity),
    visual: {
      background: string(visual.background, "visual.background"),
      backgroundImage: optionalString(visual.backgroundImage, "visual.backgroundImage"),
      backgroundSize: option(visual.backgroundSize ?? "cover", ["cover", "contain"] as const, "visual.backgroundSize"),
      backgroundPosition: string(visual.backgroundPosition ?? "center", "visual.backgroundPosition"),
      backgroundOpacity: number(visual.backgroundOpacity ?? 1, 0, 1, "visual.backgroundOpacity"),
      tone: visual.tone === undefined ? undefined : option(visual.tone, ["intimidating", "neutral", "humanitarian"] as const, "visual.tone"),
      foreground: string(visual.foreground, "visual.foreground"), accent: string(visual.accent, "visual.accent"),
      font: string(visual.font, "visual.font"), overlay: number(visual.overlay, 0, 1, "visual.overlay"),
      vignette: boolean(visual.vignette, "visual.vignette"),
      atmosphere: option(visual.atmosphere, ["grid", "scanlines", "none"] as const, "visual.atmosphere"),
    },
    entrance: {
      transition: option(entrance.transition, ["fade", "rise"] as const, "entrance.transition"),
      durationMs: number(entrance.durationMs, 0, 2000, "entrance.durationMs"),
    },
    sections: validateSections(data.sections),
  };
}
