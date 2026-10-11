import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import test from "node:test";
import { createCommandBus, commandCompletions } from "../src/runtime/commands.ts";
import { initialSceneState, sceneReducer } from "../src/runtime/scenes.ts";
import { baseDestinations, destinationRegistry } from "../src/runtime/destinations.ts";
import { validateCatalog, validateManifest } from "../src/projects/validation.ts";

const rawCatalog = JSON.parse(await readFile(new URL("../public/projects/index.json", import.meta.url), "utf8"));
const home = JSON.parse(await readFile(new URL("../src/data/home.json", import.meta.url), "utf8"));
const catalog = validateCatalog(rawCatalog);
const base = baseDestinations(home.information.map((item) => item.id));

function session(entries = catalog) {
  let state = initialSceneState;
  const actions = [];
  const registry = destinationRegistry(entries, base);
  const bus = createCommandBus({
    dispatch(action) { actions.push(action); state = sceneReducer(state, action); },
    async resolveDestination(id) { return registry.get(id); },
    async listDestinations() { return [...registry.keys()]; },
  });
  return { bus, actions, get state() { return state; } };
}

test("the requested vertical slice preserves scene history while the terminal controls it", async () => {
  const run = session();
  await run.bus.execute(home.navigation.find((item) => item.command === "tp champions").command);
  assert.equal(run.state.currentScene.id, "champions");
  await run.bus.execute(catalog.projects[0].command);
  assert.deepEqual(run.state.currentScene, { id: "project-experience", projectId: catalog.projects[0].id });
  assert.equal(run.state.selectedProject, catalog.projects[0].id);
  await run.bus.execute("open terminal");
  await run.bus.execute("tp home");
  assert.equal(run.state.currentScene.id, "home");
  assert.equal(run.state.terminalOpen, true);
  assert.equal(run.state.selectedProject, null);
  await run.bus.execute("tp champions");
  const before = run.state;
  assert.match((await run.bus.execute("help")).message, new RegExp(catalog.projects[0].id));
  assert.equal((await run.bus.execute("clear")).kind, "clear");
  assert.equal(run.state, before);
  await run.bus.execute("back");
  assert.equal(run.state.currentScene.id, "home");
  assert.equal(run.state.previousScene.id, "champions");
  await run.bus.execute("close terminal");
  assert.equal(run.state.terminalOpen, false);
});

test("a Home button command and its terminal alias dispatch the same navigation action", async () => {
  const click = session();
  const terminal = session();
  await click.bus.execute(home.navigation.find((item) => item.command === "tp projects").command);
  await terminal.bus.execute("  PROJECTS  ");
  assert.deepEqual(click.actions, terminal.actions);
  await terminal.bus.execute("tp projects");
  assert.equal(terminal.state.history.length, 1, "repeated destination does not grow history");
});

test("adding catalog data registers a new champion without engine changes", async () => {
  const data = structuredClone(rawCatalog);
  data.projects.push({ ...data.projects[0], id: "test-champion", manifest: "test-champion/project.json", command: "tp test-champion" });
  const run = session(validateCatalog(data));
  assert.equal((await run.bus.execute("tp test-champion")).kind, "success");
  assert.equal(run.state.selectedProject, "test-champion");
  assert.ok(commandCompletions(["test-champion"]).includes("tp test-champion"));
});

test("unknown commands and destinations leave the active scene intact", async () => {
  const run = session();
  for (const input of ["tp missing", "tp", "tp home extra", "open sesame", "help extra"]) {
    assert.equal((await run.bus.execute(input)).kind, "error");
    assert.equal(run.state, initialSceneState);
  }
  await run.bus.execute("back");
  assert.equal(run.state, initialSceneState);
});

test("a late catalog lookup cannot overwrite a newer navigation command", async () => {
  let resolveDelayed;
  let state = initialSceneState;
  const bus = createCommandBus({
    dispatch(action) { state = sceneReducer(state, action); },
    resolveDestination(id) { return id === "slow-project" ? new Promise((resolve) => { resolveDelayed = resolve; }) : Promise.resolve({ id: "projects" }); },
    async listDestinations() { return []; },
  });
  const slow = bus.execute("tp slow-project");
  await bus.execute("tp projects");
  resolveDelayed({ id: "project-experience", projectId: "slow-project" });
  await slow;
  assert.equal(state.currentScene.id, "projects");
});

test("catalog validation rejects duplicate IDs and conflicting destinations", () => {
  const data = structuredClone(rawCatalog);
  data.projects.push(data.projects[0]);
  assert.throws(() => validateCatalog(data), /Duplicate/);
  const collision = structuredClone(rawCatalog);
  collision.projects[0].id = "home";
  assert.throws(() => destinationRegistry(validateCatalog(collision), base), /collision/);
});

test("all shipped manifests validate; malformed sections and unsafe links are rejected", async () => {
  for (const project of catalog.projects) {
    const raw = JSON.parse(await readFile(new URL(`../public/projects/${project.manifest}`, import.meta.url), "utf8"));
    const result = validateManifest(raw, project.id);
    assert.ok(result.sections.length > 0);
    const invalid = structuredClone(raw);
    invalid.sections.push({ type: "custom-page", title: "Unsupported" });
    assert.throws(() => validateManifest(invalid, project.id), /Unsupported section/);
    invalid.sections = [{ type: "links", title: "Invalid", items: [{ label: "Unsafe", href: "javascript:alert(1)" }] }];
    assert.throws(() => validateManifest(invalid, project.id), /HTTP/);
    assert.throws(() => validateManifest(raw, "different-id"), /does not match/);
  }
});
