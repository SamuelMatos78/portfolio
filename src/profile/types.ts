import type { LocalizedText } from "../i18n/types";
import type { ProjectSection } from "../types/project";

interface CardBase { id: string; title: LocalizedText; symbol?: string; published: boolean }
export type ProfileCard =
  | (CardBase & { type: "link"; description: LocalizedText; href?: string })
  | (CardBase & { type: "note"; body: LocalizedText })
  | (CardBase & { type: "testimonial"; quote: LocalizedText; author: { name: string; role?: LocalizedText; relationship?: LocalizedText } });

export interface ProfileData {
  name: string;
  photo?: { src: string; alt: LocalizedText; position?: string };
  eyebrow: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  details: { label: LocalizedText; value: LocalizedText }[];
  full: { title: LocalizedText; paragraphs: LocalizedText[]; note?: LocalizedText; sections?: ProjectSection[] };
  cards: ProfileCard[];
}
