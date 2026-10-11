import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validateResume } from "../src/resume/validation.ts";
import { generateResume } from "../scripts/generate-resume.mjs";

const raw = JSON.parse(await readFile(new URL("../src/data/resume.json", import.meta.url), "utf8"));

test("resume configuration validates translations, IDs and safe distinct PDF filenames", () => {
  assert.equal(validateResume(raw).documents.pt, raw.documents.pt);
  assert.throws(() => validateResume({ ...raw, documents: { pt: "../escape.pdf", en: "resume-en.pdf" } }), /filenames/);
  assert.throws(() => validateResume({ ...raw, documents: { pt: "same.pdf", en: "same.pdf" } }), /distinct/);
  assert.throws(() => validateResume({ ...raw, role: { pt: "Fixture" } }), /en/);
  assert.throws(() => validateResume({ ...raw, selectedProjects: ["same", "same"] }), /unique/);
});

test("PDF export produces complete A4 documents for both languages with embedded fonts and working contact links", async () => {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-resume-"));
  try {
    const results = await generateResume(directory);
    assert.deepEqual(results.map((result) => result.locale), ["pt", "en"]);
    for (const result of results) {
      const bytes = await readFile(join(directory, result.filename));
      const pdf = bytes.toString("latin1");
      assert.ok(pdf.startsWith("%PDF-"));
      assert.match(pdf, /%%EOF/);
      assert.equal((pdf.match(/\/Type \/Page\b/g) ?? []).length, result.pages, "footers must not create additional pages");
      assert.match(pdf, /\/FontFile2/);
      assert.match(pdf, /\/MediaBox \[0 0 595\.28 841\.89\]/);
      assert.match(pdf, /https:\/\/www\.linkedin\.com\/in\/samuel-oliveira-matos-a9b753237/);
      assert.ok(bytes.length > 20000);
    }
  } finally { await rm(directory, { recursive: true, force: true }); }
});
