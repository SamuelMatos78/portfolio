import type { ProjectCatalog, ProjectManifest, ProjectSummary } from "../types/project";
import { validateCatalog, validateManifest } from "./validation";

const catalogPath = `${import.meta.env.BASE_URL}projects/index.json`;
let catalogCache: Promise<ProjectCatalog> | undefined;
const manifestCache = new Map<string, Promise<ProjectManifest>>();
const imageCache = new Set<string>();

export function assetURL(path: string | undefined, relativeTo: string): string | undefined {
  if (!path) return undefined;
  const url = new URL(path, new URL(relativeTo, window.location.origin));
  if (!["http:", "https:"].includes(url.protocol)) throw new Error(`Unsupported asset protocol: ${url.protocol}`);
  return url.href;
}

async function fetchJSON(path: string): Promise<unknown> {
  const response = await fetch(path, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Could not fetch ${path} (${response.status}).`);
  return response.json();
}

export function loadCatalog(): Promise<ProjectCatalog> {
  if (!catalogCache) {
    catalogCache = fetchJSON(catalogPath).then(validateCatalog).then((catalog) => ({
      ...catalog,
      projects: catalog.projects.map((project) => {
        const manifest = assetURL(project.manifest, catalogPath)!;
        if (new URL(manifest).origin !== window.location.origin) throw new Error("Project manifests must be hosted with this portfolio.");
        return { ...project, manifest, hall: { ...project.hall, image: assetURL(project.hall.image, catalogPath) } };
      }),
    })).catch((error: unknown) => {
      catalogCache = undefined;
      throw error;
    });
  }
  return catalogCache;
}

export function loadProject(project: ProjectSummary): Promise<ProjectManifest> {
  const cached = manifestCache.get(project.manifest);
  if (cached) return cached;
  const request = fetchJSON(project.manifest).then((value) => validateManifest(value, project.id)).then((manifest) => ({
    ...manifest,
    visual: { ...manifest.visual, backgroundImage: assetURL(manifest.visual.backgroundImage, project.manifest) },
    sections: manifest.sections.map((section) => {
      if (section.type === "hero") return { ...section, image: assetURL(section.image, project.manifest) };
      if (section.type === "gallery") return { ...section, items: section.items.map((item) => ({ ...item, image: assetURL(item.image, project.manifest) })) };
      return section;
    }),
  })).catch((error: unknown) => {
    manifestCache.delete(project.manifest);
    throw error;
  });
  manifestCache.set(project.manifest, request);
  return request;
}

function prefetchImage(url: string | undefined) {
  if (!url || imageCache.has(url)) return;
  imageCache.add(url);
  const image = new Image();
  image.onerror = () => imageCache.delete(url);
  image.src = url;
}

export async function prefetchProject(project: ProjectSummary): Promise<void> {
  prefetchImage(project.hall.image);
  const manifest = await loadProject(project);
  prefetchImage(manifest.visual.backgroundImage);
  for (const section of manifest.sections) {
    if (section.type === "hero") prefetchImage(section.image);
  }
}
