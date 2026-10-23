import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { commandHref, destinationFromURL, sceneURL, teleportHref } from "../src/runtime/links.ts";
import { createCommandBus } from "../src/runtime/commands.ts";
import { baseDestinations, destinationLabels, destinationRegistry, resolveRegisteredDestination } from "../src/runtime/destinations.ts";
import { validateCatalog } from "../src/projects/validation.ts";

test("teleport links encode destinations, preserve base paths and normalize travel aliases", () => {
  assert.equal(commandHref("tp derisor"), "#tp=derisor");
  assert.equal(commandHref("ir currículo"), "#tp=curriculum");
  assert.equal(destinationFromURL({ hash: teleportHref("Sobre mim"), search: "" }), "Sobre mim");
  assert.equal(destinationFromURL({ hash: "", search: "?tp=pdfall" }), "pdfall");
  assert.equal(destinationFromURL({ hash: "#tp=about", search: "?tp=pdfall" }), "about");
  assert.equal(destinationFromURL({ hash: "#about-preview", search: "" }), undefined);
  assert.equal(destinationFromURL({ hash: "", search: "" }), "home");
  assert.throws(() => commandHref("open terminal"), /travel/);
  assert.equal(sceneURL("https://example.com/portfolio/?utm_source=share&tp=sobre", { id: "information", informationId: "about" }).href, "https://example.com/portfolio/?utm_source=share#tp=about");
});

test("URL destinations use the same registry and bus, with replace history and no arbitrary commands", async () => {
  const readJSON = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
  const home = await readJSON("../src/data/home.json");
  const catalog = validateCatalog(await readJSON("../public/projects/index.json"));
  const registry = destinationRegistry(catalog, baseDestinations(home.information.map((item) => item.id)));
  const labels = destinationLabels(catalog, home.information);
  const actions = [];
  const bus = createCommandBus({ dispatch: (action, mode) => actions.push({ action, mode }), resolveDestination: async (input) => resolveRegisteredDestination(input, registry, labels), listDestinations: async () => [...registry.keys()] });
  for (const project of catalog.projects) {
    const destination = destinationFromURL({ hash: commandHref(project.command), search: "" });
    assert.equal((await bus.execute(`tp ${destination}`, "pt", undefined, { history: "replace" })).kind, "success");
    assert.deepEqual(actions.at(-1), { action: { type: "navigate", destination: { id: "project-experience", projectId: project.id } }, mode: "replace" });
  }
  const count = actions.length;
  assert.equal((await bus.execute("tp open terminal", "pt", undefined, { history: "replace" })).kind, "error");
  assert.equal(actions.length, count);
});
