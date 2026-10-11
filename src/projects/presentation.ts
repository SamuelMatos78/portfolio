import type { CSSProperties } from "react";
import presets from "../data/presentation-presets.json";
import type { ProjectPresentation, RegionTone } from "../types/project";

export function projectPresentation(tone: RegionTone, overrides?: ProjectPresentation) {
  return { ...presets[tone], ...overrides };
}

export function presentationStyle(accent: string, presentation: ReturnType<typeof projectPresentation>): CSSProperties {
  return {
    "--card-accent": accent,
    "--surface-accent": accent,
    "--surface-secondary": presentation.secondaryAccent,
    "--portrait-fit": presentation.imageFit,
    "--portrait-position": presentation.imagePosition,
  } as CSSProperties;
}
