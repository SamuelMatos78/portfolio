import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { validateInformation } from "../src/runtime/information.ts";

const home = JSON.parse(await readFile(new URL("../src/data/home.json", import.meta.url), "utf8"));
const content = JSON.parse(await readFile(new URL("../src/data/information.json", import.meta.url), "utf8"));
const ids = home.information.map((item) => item.id);

test("information pages accept data-only sections for registered destinations", () => {
  const validated = validateInformation(content, ids);
  assert.ok(validated.contact.some((section) => section.type === "links"));
  assert.ok(validated.curriculum.length);
  assert.ok(validated.titles.length);
  assert.deepEqual(validateInformation({ newPage: [{ type: "text", title: "Fixture", body: "Fixture" }] }, ["newPage"]).newPage[0], { type: "text", title: "Fixture", body: "Fixture" });
});

test("information rejects unregistered pages, incomplete translations and unsafe links", () => {
  assert.throws(() => validateInformation({ unknown: [] }, ids), /Unregistered/);
  assert.throws(() => validateInformation({ contact: [{ type: "text", title: "Fixture", body: { pt: "Fixture" } }] }, ids), /en/);
  assert.throws(() => validateInformation({ contact: [{ type: "links", title: "Fixture", items: [{ label: "Fixture", href: "javascript:alert(1)" }] }] }, ids), /HTTP/);
});
