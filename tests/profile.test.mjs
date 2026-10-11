import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateProfile } from "../src/profile/validation.ts";
import { createCommandBus, commandCompletions, interpretCommand } from "../src/runtime/commands.ts";

const raw = JSON.parse(await readFile(new URL("../src/data/profile.json", import.meta.url), "utf8"));

test("tp is the canonical navigation command used by shortcuts, help and completions", async () => {
  const actions = [];
  const bus = createCommandBus({ dispatch: (action) => actions.push(action), resolveDestination: async (id) => id === "about" ? { id: "information", informationId: id } : undefined, listDestinations: async () => ["about"] });
  assert.deepEqual(interpretCommand("tp sobre"), { type: "tp", destination: "about" });
  assert.deepEqual(interpretCommand("ir sobre"), interpretCommand("tp about"));
  assert.equal((await bus.execute("tp about")).kind, "success");
  assert.deepEqual(actions[0], { type: "navigate", destination: { id: "information", informationId: "about" } });
  const help = await bus.execute("help");
  assert.match(help.message, /tp/);
  assert.ok(commandCompletions(["about"]).includes("tp about"));
  assert.ok(!commandCompletions(["about"]).includes("teleport about"));
  assert.equal((await bus.execute("teleport about")).kind, "error");
});

test("profile cards support real links, notes and selected testimonials using only data", () => {
  const data = structuredClone(raw);
  data.cards.push({ id: "test-link", type: "link", title: "Test link", description: "Fixture", href: "https://example.com/fixture" });
  data.cards.push({ id: "test-note", type: "note", title: { pt: "Nota", en: "Note" }, body: { pt: "Fixture", en: "Fixture" } });
  data.cards.push({ id: "test-comment", type: "testimonial", title: "Fixture", quote: { pt: "Comentário de teste", en: "Test comment" }, author: { name: "TEST AUTHOR" }, published: true });
  const profile = validateProfile(data);
  assert.equal(profile.cards.length, raw.cards.length + 3);
  assert.equal(profile.cards.find((card) => card.id === "test-link").href, "https://example.com/fixture");
  assert.equal(profile.cards.find((card) => card.id === "test-comment").author.name, "TEST AUTHOR");
  assert.equal(profile.cards.find((card) => card.id === "selected-testimonial").published, false);
  assert.equal(profile.cards.find((card) => card.id === "linkedin").href, raw.cards.find((card) => card.id === "linkedin").href);
});

test("invalid profile translations, unsafe URLs and duplicate IDs are rejected", () => {
  const unsafe = structuredClone(raw);
  unsafe.cards[0].href = "javascript:alert(1)";
  assert.throws(() => validateProfile(unsafe), /HTTP/);
  const duplicate = structuredClone(raw);
  duplicate.cards.push(duplicate.cards[0]);
  assert.throws(() => validateProfile(duplicate), /Duplicate/);
  const incomplete = structuredClone(raw);
  incomplete.summary = { pt: "Resumo" };
  assert.throws(() => validateProfile(incomplete), /en/);
});

test("profile photos and full sections support optional data and reject malformed content", () => {
  const data = structuredClone(raw);
  data.photo = { src: "me.jpeg", alt: { pt: "Foto de Samuel", en: "Samuel's photo" } };
  data.full.sections = [{ type: "text", title: "Fixture", body: { pt: "Experiência", en: "Experience" } }];
  const profile = validateProfile(data);
  assert.equal(profile.photo.src, "me.jpeg");
  assert.equal(profile.full.sections[0].type, "text");
  data.photo.src = "../../secret.jpeg";
  assert.throws(() => validateProfile(data), /filename/);
  data.photo.src = "me.jpeg";
  data.full.sections[0].body = { pt: "Fixture" };
  assert.throws(() => validateProfile(data), /en/);
  delete data.photo;
  delete data.full.sections;
  assert.equal(validateProfile(data).photo, undefined);
});
