import type { LocalizedText } from "../i18n/types";

export interface ResumeData {
  eyebrow: LocalizedText;
  role: LocalizedText;
  statement: LocalizedText;
  focus: LocalizedText[];
  contactCards: string[];
  selectedProjects: string[];
  documents: { pt: string; en: string };
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be a nonempty string.`);
  return value;
}
function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, field: string): LocalizedText {
  if (typeof value === "string") return string(value, field);
  const data = record(value, field);
  return { pt: string(data.pt, `${field}.pt`), en: string(data.en, `${field}.en`) };
}
function list(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${field} must be an array.`);
  return value;
}
function ids(value: unknown, field: string): string[] {
  const items = list(value, field).map((item) => string(item, field));
  if (new Set(items).size !== items.length || items.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) throw new Error(`${field} must contain unique destination IDs.`);
  return items;
}

export function validateResume(value: unknown): ResumeData {
  const data = record(value, "resume");
  const documents = record(data.documents, "resume.documents");
  const pt = string(documents.pt, "documents.pt");
  const en = string(documents.en, "documents.en");
  if ([pt, en].some((name) => !/^[a-z0-9]+(?:-[a-z0-9]+)*\.pdf$/.test(name)) || pt === en) throw new Error("Resume documents must have distinct local PDF filenames.");
  return {
    eyebrow: text(data.eyebrow, "resume.eyebrow"), role: text(data.role, "resume.role"), statement: text(data.statement, "resume.statement"),
    focus: list(data.focus, "resume.focus").map((item) => text(item, "focus")),
    contactCards: ids(data.contactCards, "resume.contactCards"), selectedProjects: ids(data.selectedProjects, "resume.selectedProjects"), documents: { pt, en },
  };
}
