import type { LocalizedText } from "../i18n/types";
import type { ProfileCard, ProfileData } from "./types";
import { validateSections } from "../projects/validation.ts";

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as Record<string, unknown>;
}
function string(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a nonempty string.`);
  return value;
}
function text(value: unknown, field: string): LocalizedText {
  if (typeof value === "string") return string(value, field);
  const data = object(value, field);
  return { pt: string(data.pt, `${field}.pt`), en: string(data.en, `${field}.en`) };
}
function optionalText(value: unknown, field: string) { return value === undefined ? undefined : text(value, field); }
function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value;
}

export function validateProfile(value: unknown): ProfileData {
  const data = object(value, "profile");
  const full = object(data.full, "profile.full");
  let photo: ProfileData["photo"];
  if (data.photo !== undefined) {
    const item = object(data.photo, "profile.photo");
    const src = string(item.src, "photo.src");
    if (!/^[a-zA-Z0-9_-]+\.(?:jpe?g|png|webp|avif)$/i.test(src)) throw new Error("photo.src must be an image filename in src/assets.");
    photo = { src, alt: text(item.alt, "photo.alt"), position: item.position === undefined ? undefined : string(item.position, "photo.position") };
  }
  const cards = array(data.cards, "profile.cards").map((value): ProfileCard => {
    const card = object(value, "card");
    if (card.published !== undefined && typeof card.published !== "boolean") throw new Error("card.published must be boolean.");
    const base = {
      id: string(card.id, "card.id"), title: text(card.title, "card.title"),
      symbol: card.symbol === undefined ? undefined : string(card.symbol, "card.symbol"), published: card.published !== false,
    };
    switch (card.type) {
      case "link": {
        const href = card.href === undefined ? undefined : string(card.href, "card.href");
        if (href) {
          const url = new URL(href);
          if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("card.href must be an absolute HTTP(S) URL without credentials.");
        }
        return { ...base, type: "link", description: text(card.description, "card.description"), href };
      }
      case "note": return { ...base, type: "note", body: text(card.body, "card.body") };
      case "testimonial": {
        const author = object(card.author, "card.author");
        return { ...base, type: "testimonial", quote: text(card.quote, "card.quote"), author: {
          name: string(author.name, "author.name"), role: optionalText(author.role, "author.role"), relationship: optionalText(author.relationship, "author.relationship"),
        } };
      }
      default: throw new Error(`Unsupported profile card type: ${String(card.type)}.`);
    }
  });
  if (new Set(cards.map((card) => card.id)).size !== cards.length) throw new Error("Duplicate profile card id.");
  return {
    name: string(data.name, "profile.name"), photo, eyebrow: text(data.eyebrow, "profile.eyebrow"), title: text(data.title, "profile.title"), summary: text(data.summary, "profile.summary"),
    details: array(data.details, "profile.details").map((value) => {
      const detail = object(value, "detail"); return { label: text(detail.label, "detail.label"), value: text(detail.value, "detail.value") };
    }),
    full: { title: text(full.title, "profile.full.title"), paragraphs: array(full.paragraphs, "profile.full.paragraphs").map((value) => text(value, "paragraph")), note: optionalText(full.note, "profile.full.note"), sections: full.sections === undefined ? undefined : validateSections(full.sections) },
    cards,
  };
}
