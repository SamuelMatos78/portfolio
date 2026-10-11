import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { cp } from "node:fs/promises";
import { createCommandBus, commandCompletions } from "../src/runtime/commands.ts";
import { baseDestinations, destinationLabels, destinationRegistry, resolveRegisteredDestination } from "../src/runtime/destinations.ts";
import { initialSceneState, scenePath, sceneReducer } from "../src/runtime/scenes.ts";
import { validateCatalog, validateManifest, validatePresentation } from "../src/projects/validation.ts";
import { addProject, addUpdate, checkContent } from "../scripts/content-helper.mjs";

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const home = await readJSON(new URL("../src/data/home.json", import.meta.url));
const raw = await readJSON(new URL("../public/projects/index.json", import.meta.url));
const catalog = validateCatalog(raw);
const base = baseDestinations(home.information.map((item) => item.id));
const registry = destinationRegistry(catalog, base);
const labels = destinationLabels(catalog, home.information);

test("Portuguese and English verbs, accented destinations and shell paths use the same navigation", async () => {
  let state = initialSceneState;
  const bus = createCommandBus({
    dispatch: (action) => { state = sceneReducer(state, action); },
    resolveDestination: async (input) => resolveRegisteredDestination(input, registry, labels),
    listDestinations: async () => [...registry.keys()],
    currentPath: () => scenePath(state.currentScene),
  });
  for (const input of ["tp champions", "tp campeões", "TELEPORTAR CAMPEÕES", "ir para generais", "go to generals", "cd ~/champions"]) {
    assert.equal((await bus.execute(input, "pt")).kind, "success", input);
    assert.equal(state.currentScene.id, "champions", input);
  }
  assert.equal((await bus.execute('ir "Causas e iniciativas"', "pt")).kind, "success");
  assert.deepEqual(state.currentScene, { id: "category", categoryId: "initiatives" });
  assert.equal((await bus.execute("onde", "pt")).message, "~/initiatives");
  await bus.execute("cd ..");
  assert.equal(state.currentScene.id, "champions");
  await bus.execute("cd /");
  assert.equal(state.currentScene.id, "home");
  await bus.execute("teletransportar currículo");
  assert.equal(state.currentScene.informationId, "curriculum");
  await bus.execute("cd");
  assert.equal(state.currentScene.id, "home");
  assert.match((await bus.execute("listar", "pt")).message, /derrisor\//);
  assert.ok(commandCompletions([...registry.keys()]).includes("teleportar campeoes"));
});

test("region personality and visible background are manifest data", async () => {
  assert.equal(catalog.categories.find((item) => item.id === "champions").visual.tone, "intimidating");
  assert.equal(catalog.categories.find((item) => item.id === "initiatives").visual.tone, "humanitarian");
  const project = catalog.projects.find((item) => item.id === "derrisor");
  const manifest = validateManifest(await readJSON(new URL(`../public/projects/${project.manifest}`, import.meta.url)), project.id);
  assert.ok(manifest.visual.overlay < 0.5);
  assert.equal(manifest.visual.backgroundSize, "contain");
  assert.ok(manifest.visual.backgroundOpacity > 0.5);
});

test("presentation overrides are optional, partial and validated for old and new content", () => {
  assert.equal(validatePresentation(undefined), undefined);
  assert.deepEqual(validatePresentation({ icon: "shield" }), { icon: "shield" });
  assert.deepEqual(validatePresentation({ tone: "humanitarian", imageFit: "cover", imagePosition: "right top" }), { tone: "humanitarian", imageFit: "cover", imagePosition: "right top" });
  assert.throws(() => validatePresentation({ imageFit: "stretch" }), /imageFit/);
  assert.throws(() => validatePresentation({ tone: "unknown" }), /tone/);
  assert.throws(() => validatePresentation({ icon: "../escape" }), /icon/);
  const legacy = structuredClone(raw);
  for (const project of legacy.projects) delete project.presentation;
  assert.equal(validateCatalog(legacy).projects[0].presentation, undefined);
});

test("the helper adds a data-only project, copies an asset, registers updates and rejects unsafe/duplicate writes", async () => {
  const temporary = await mkdtemp(join(tmpdir(), "portfolio-content-"));
  const root = join(temporary, "projects");
  try {
    await cp(new URL("../public/projects/", import.meta.url), root, { recursive: true });
    await addProject(root, { id: "fixture-general", name: "Fixture General", category: "champions", presentation: { icon: "shield", secondaryAccent: "#db8268", imageFit: "cover" }, image: fileURLToPath(new URL("../public/projects/derrisor/assets/portrait.jpeg", import.meta.url)) });
    const checked = await checkContent(root);
    assert.equal(checked.projects, catalog.projects.length + 1);
    await access(join(root, "fixture-general/assets/portrait.jpeg"));
    const config = await readJSON(join(root, "fixture-general/project.json"));
    assert.equal(config.visual.tone, "intimidating");
    assert.equal(config.visual.backgroundImage, "assets/portrait.jpeg");
    const preview = (await readJSON(join(root, "index.json"))).projects.find((item) => item.id === "fixture-general");
    assert.deepEqual(preview.presentation, { tone: "intimidating", icon: "shield", secondaryAccent: "#db8268", imageFit: "cover" });
    await assert.rejects(addProject(root, { id: "missing-icon", name: "Missing icon", category: "champions", presentation: { icon: "missing-fixture-icon" } }), /Ícone inexistente/);
    await assert.rejects(access(join(root, "missing-icon")));
    await assert.rejects(addProject(root, { id: "invalid-presentation", name: "Invalid", category: "champions", presentation: { imageFit: "stretch" } }), /imageFit/);
    await assert.rejects(addProject(root, { id: "fixture-general", name: "Duplicate", category: "champions" }), /já registrado/);
    await assert.rejects(addProject(root, { id: "../escape", name: "Unsafe", category: "champions" }), /ID/);
    await assert.rejects(addProject(root, { id: "missing-image", name: "Missing", category: "champions", image: join(temporary, "missing.png") }));
    await assert.rejects(access(join(root, "missing-image")));
    const update = { id: "fixture-dispatch", project: "fixture-general", date: "2026-10-10", title: { pt: "Exemplo de teste", en: "Test example" }, body: { pt: "Fixture, não publicação real.", en: "Fixture, not a real announcement." } };
    await addUpdate(root, update);
    assert.equal((await checkContent(root)).updates, catalog.updates.length + 1);
    await assert.rejects(addUpdate(root, update), /já registrado/);
    await assert.rejects(addUpdate(root, { ...update, id: "invalid-date", date: "2026-02-30" }), /date/);
    await assert.rejects(addUpdate(root, { ...update, id: "invalid-project", project: "missing-project" }), /Unregistered/);
    const updated = validateCatalog(await readJSON(join(root, "index.json")));
    assert.equal(updated.updates.find((item) => item.id === update.id).command, "tp fixture-general");
    await addProject(root, { id: "fixture-cause", name: "Fixture Cause", category: "champions", presentation: { tone: "humanitarian", icon: "heart-handshake" } });
    const cause = await readJSON(join(root, "fixture-cause/project.json"));
    assert.equal(cause.visual.tone, "humanitarian");
    assert.equal(cause.visual.background, "#f0eee2");
    assert.equal(validateCatalog(await readJSON(join(root, "index.json"))).projects.find((project) => project.id === "fixture-cause").presentation.tone, "humanitarian");
    await assert.rejects(access(join(root, ".content-lock")));
  } finally { await rm(temporary, { recursive: true, force: true }); }
});
