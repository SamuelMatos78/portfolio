import type { LocalizedText } from "../i18n/types";
import type { ProjectPresentation, RegionTone } from "./project";

export interface NavigationItem {
  label: LocalizedText;
  command: string;
}

export interface FeaturedItem {
  id: string;
  name: string;
  type: string;
  description: string;
  image?: string;
  accent: string;
  tone?: RegionTone;
  presentation?: ProjectPresentation;
  command: string;
}

export interface HomeData {
  intro: { eyebrow: LocalizedText; title: LocalizedText; role: LocalizedText; description: LocalizedText };
  navigation: NavigationItem[];
  information: { id: string; title: LocalizedText; description: LocalizedText; note?: LocalizedText; content?: string }[];
  paths: { label: LocalizedText; description: LocalizedText; command: string; symbol: string; icon?: string; tone?: string; category?: string }[];
}
