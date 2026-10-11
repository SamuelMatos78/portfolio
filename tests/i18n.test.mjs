import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { messages, localize, preferredLocale } from "../src/i18n/messages.ts";
import { createCommandBus, interpretCommand, commandCompletions } from "../src/runtime/commands.ts";
import { validateCatalog, validateManifest } from "../src/projects/validation.ts";
import { baseDestinations, destinationRegistry } from "../src/runtime/destinations.ts";

const readJSON = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const home = await readJSON("../src/data/home.json");
const aliases = await readJSON("../src/data/commands.json");
const catalog = validateCatalog(await readJSON("../public/projects/index.json"));

test("locale preference respects saved choice, browser language and Portuguese fallback", () => {
  assert.equal(preferredLocale("en", ["pt-BR"]), "en");
  assert.equal(preferredLocale(null, ["pt-BR", "en"]), "pt");
  assert.equal(preferredLocale("invalid", ["en-US"]), "en");
  assert.equal(preferredLocale(null, ["fr-FR"]), "pt");
  assert.equal(localize("GitHub", "pt"), "GitHub");
  assert.equal(localize({ pt: "Projetos", en: "Projects" }, "en"), "Projects");
  assert.deepEqual(Object.keys(messages.pt).sort(), Object.keys(messages.en).sort());
});

test("configured shortcuts use the same interpreter and appear in help and autocomplete", async () => {
  assert.equal(new Set(aliases.map((alias) => alias.command)).size, aliases.length);
  const completions = commandCompletions([]);
  for (const alias of aliases) {
    assert.deepEqual(interpretCommand(alias.command), interpretCommand(alias.target));
    assert.ok(completions.includes(alias.command));
  }
  const actions = [];
  const registry = destinationRegistry(catalog, baseDestinations(home.information.map((item) => item.id)));
  const bus = createCommandBus({ dispatch: (action) => actions.push(action), resolveDestination: async (id) => registry.get(id), listDestinations: async () => [...registry.keys()] });
  const pt = await bus.execute("  PROJETOS  ", "pt");
  assert.equal(pt.message, "Destino: projects");
  await bus.execute("projects", "en");
  assert.deepEqual(actions[0], actions[1]);
  assert.match((await bus.execute("ajuda", "pt")).message, /Destinos:/);
  assert.match((await bus.execute("help", "en")).message, /Destinations:/);
  assert.equal((await bus.execute("limpar", "pt")).kind, "clear");
  assert.match((await bus.execute("tp missing", "pt")).message, /Destino desconhecido/);
  assert.equal((await bus.execute("constructor", "pt")).kind, "error");
});

test("every Home entry and configured tp shortcut points to registered content", () => {
  const registry = destinationRegistry(catalog, baseDestinations(home.information.map((item) => item.id)));
  for (const item of [...home.navigation, ...home.paths, ...aliases.map((alias) => ({ command: alias.target }))]) {
    const command = interpretCommand(item.command);
    if (command.type === "tp") assert.ok(registry.has(command.destination), `Missing ${command.destination}`);
  }
  assert.equal(registry.get("curriculum").id, "information");
});

test("localized manifests validate without changing asset paths or stable IDs", async () => {
  for (const project of catalog.projects) {
    const raw = await readJSON(`../public/projects/${project.manifest}`);
    const manifest = validateManifest(raw, project.id);
    assert.equal(manifest.id, project.id);
    assert.equal(manifest.visual.backgroundImage, raw.visual.backgroundImage);
    assert.ok(localize(manifest.identity.subtitle, "pt"));
    assert.ok(localize(manifest.identity.subtitle, "en"));
    const incomplete = structuredClone(raw);
    incomplete.sections[0].title = { pt: "Título" };
    assert.throws(() => validateManifest(incomplete, project.id), /en/);
  }
});
