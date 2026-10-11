import type { LocalizedText } from "../i18n/types";
export type RegionTone = "intimidating" | "neutral" | "humanitarian";

export interface ProjectPresentation {
  tone?: RegionTone;
  icon?: string;
  secondaryAccent?: string;
  imageFit?: "cover" | "contain";
  imagePosition?: string;
}

export interface ProjectIdentity {
  name: string;
  subtitle: LocalizedText;
  status: LocalizedText;
}

export interface ProjectSummary {
  id: string;
  manifest: string;
  category: string;
  featured: boolean;
  presentation?: ProjectPresentation;
  identity: ProjectIdentity;
  hall: {
    image?: string;
    accent: string;
    hoverText: LocalizedText;
    hoverEffect: "scan" | "pulse" | "lift" | "none";
  };
  command: string;
}

export interface ProjectCategory {
  id: string;
  label: LocalizedText;
  description: LocalizedText;
  visual: { accent: string; symbol: string; tone: RegionTone; icon?: string };
  command: string;
}

export interface ProjectCatalog {
  categories: ProjectCategory[];
  projects: ProjectSummary[];
  updates: ProjectUpdate[];
}

export interface ProjectUpdate {
  id: string;
  date: string;
  projectId?: string;
  title: LocalizedText;
  body: LocalizedText;
  command?: string;
}

export type ProjectSection =
  | { type: "hero"; title: LocalizedText; eyebrow?: LocalizedText; description: LocalizedText; image?: string }
  | { type: "text"; title: LocalizedText; body: LocalizedText }
  | { type: "stats"; title: LocalizedText; items: { label: LocalizedText; value: LocalizedText; note?: LocalizedText }[] }
  | { type: "gallery"; title: LocalizedText; items: { caption: LocalizedText; image?: string; alt: LocalizedText }[] }
  | { type: "links"; title: LocalizedText; items: { label: LocalizedText; href?: string; note?: LocalizedText }[] };

export interface ProjectManifest {
  id: string;
  identity: ProjectIdentity;
  visual: {
    background: string;
    backgroundImage?: string;
    backgroundSize: "cover" | "contain";
    backgroundPosition: string;
    backgroundOpacity: number;
    tone?: RegionTone;
    foreground: string;
    accent: string;
    font: string;
    overlay: number;
    vignette: boolean;
    atmosphere: "grid" | "scanlines" | "none";
  };
  entrance: { transition: "fade" | "rise"; durationMs: number };
  sections: ProjectSection[];
}

