import { mkdir, readFile, writeFile, rename, rm, copyFile, access } from "node:fs/promises";
import { resolve, join, extname, relative, isAbsolute } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { validateCatalog, validateManifest, validatePresentation } from "../src/projects/validation.ts";
import { baseDestinations, destinationRegistry } from "../src/runtime/destinations.ts";
import { interpretCommand } from "../src/runtime/commands.ts";
import palettes from "../src/data/region-themes.json" with { type: "json" };
import { validateProfile } from "../src/profile/validation.ts";
import { validateInformation } from "../src/runtime/information.ts";
import { validateResume } from "../src/resume/validation.ts";
import { validateGitHubStats } from "../src/github/stats.ts";

const home = JSON.parse(await readFile(new URL("../src/data/home.json", import.meta.url), "utf8"));
const base = baseDestinations(home.information.map((item) => item.id));
const json = (value) => JSON.stringify(value, null, 2) + "\n";
const localized = (pt, en) => ({ pt, en });

async function checkIcon(icon) {
  if (!icon) return;
  validatePresentation({ icon });
  try { await access(new URL(`../src/assets/icons/${icon}.svg`, import.meta.url)); }
  catch { throw new Error(`Ícone inexistente: ${icon}. Adicione o SVG em src/assets/icons ou escolha um existente.`); }
}

function validID(id) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id ?? "")) throw new Error("Use um ID em minúsculas, com números e hífens.");
  return id;
}
function required(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Informe ${field}.`);
  return value.trim();
}
function checkedCatalog(data) {
  const catalog = validateCatalog(data);
  destinationRegistry(catalog, base);
  return catalog;
}
async function transaction(root, work) {
  const lock = join(root, ".content-lock");
  try { await mkdir(lock); } catch (error) {
    if (error.code === "EEXIST") throw new Error("Outro helper está usando o catálogo. Aguarde; se houve interrupção, confira e remova public/projects/.content-lock.");
    throw error;
  }
  try {
    const data = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
    checkedCatalog(data);
    return await work(data);
  } finally { await rm(lock, { recursive: true, force: true }); }
}
async function saveCatalog(root, data) {
  checkedCatalog(data);
  const temporary = join(root, `index.json.tmp-${process.pid}`);
  try {
    await writeFile(temporary, json(data), { flag: "wx" });
    await rename(temporary, join(root, "index.json"));
  } finally { await rm(temporary, { force: true }); }
}

export async function addProject(root, options) {
  return transaction(root, async (data) => {
    const id = validID(options.id);
    const name = required(options.name, "--name / name");
    const category = data.categories.find((item) => item.id === options.category);
    if (!category) throw new Error("A categoria precisa existir em index.json.");
    if (data.projects.some((item) => item.id === id) || data.categories.some((item) => item.id === id) || base.has(id)) throw new Error(`Destino já registrado: ${id}.`);
    const inputPresentation = validatePresentation(options.presentation);
    const tone = inputPresentation?.tone ?? options.tone ?? options.visual?.tone ?? category.visual.tone ?? "neutral";
    if (!palettes[tone]) throw new Error("Tone: intimidating, neutral ou humanitarian.");
    const identity = {
      name,
      subtitle: options.subtitle ?? localized("EM PREPARAÇÃO — descrição pendente.", "PLACEHOLDER — description pending."),
      status: options.status ?? localized("em preparação", "in preparation"),
    };
    let image;
    if (options.image) {
      const extension = extname(options.image).toLowerCase();
      if (![".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg"].includes(extension)) throw new Error("Formato de imagem não suportado.");
      image = `assets/portrait${extension}`;
    }
    const manifest = {
      id, identity,
      visual: { ...palettes[tone], overlay: 0.3, backgroundOpacity: 0.75, backgroundSize: "contain", backgroundPosition: "right top", ...(image ? { backgroundImage: image } : {}), ...options.visual, tone },
      entrance: options.entrance ?? { transition: "rise", durationMs: 300 },
      sections: options.sections ?? [
        { type: "hero", title: name, description: identity.subtitle, ...(image ? { image } : {}) },
        { type: "text", title: localized("Sobre", "About"), body: localized("EM PREPARAÇÃO — adicione aqui os dados reais do projeto.", "PLACEHOLDER — add the actual project details here.") },
      ],
    };
    validateManifest(manifest, id);
    const presentation = validatePresentation({ tone, ...inputPresentation });
    await checkIcon(presentation.icon);
    const summary = {
      id, manifest: `${id}/project.json`, category: category.id, featured: options.featured ?? true, identity,
      presentation,
      hall: { accent: manifest.visual.accent, hoverText: localized("ENTRE NO TERRITÓRIO", "ENTER THE TERRITORY"), hoverEffect: tone === "intimidating" ? "scan" : "lift", ...(image ? { image: `${id}/${image}` } : {}), ...options.hall },
      command: `tp ${id}`,
    };
    data.projects.unshift(summary);
    checkedCatalog(data);
    const directory = join(root, id);
    await mkdir(directory); // Never overwrite an existing project's directory.
    let committed = false;
    try {
      if (image) {
        await mkdir(join(directory, "assets"));
        await copyFile(resolve(options.image), join(directory, image));
      }
      await writeFile(join(directory, "project.json"), json(manifest), { flag: "wx" });
      await saveCatalog(root, data);
      committed = true;
      return { id, manifest: summary.manifest, command: summary.command };
    } finally {
      if (!committed) await rm(directory, { recursive: true, force: true });
    }
  });
}

export async function addUpdate(root, options) {
  return transaction(root, async (data) => {
    const id = validID(options.id);
    const title = options.title ?? localized(required(options["title-pt"], "--title-pt"), required(options["title-en"], "--title-en"));
    const body = options.body ?? localized(required(options["body-pt"], "--body-pt"), required(options["body-en"], "--body-en"));
    const update = { id, date: required(options.date, "--date YYYY-MM-DD"), title, body };
    if (options.project) {
      update.projectId = options.project;
      update.command = `tp ${options.project}`;
    }
    data.updates ??= [];
    if (data.updates.some((item) => item.id === id)) throw new Error(`Comunicado já registrado: ${id}.`);
    data.updates.push(update);
    await saveCatalog(root, data);
    return update;
  });
}

export async function checkContent(root) {
  const data = JSON.parse(await readFile(join(root, "index.json"), "utf8"));
  const catalog = checkedCatalog(data);
  const registry = destinationRegistry(catalog, base);
  for (const category of catalog.categories) await checkIcon(category.visual.icon);
  for (const project of catalog.projects) {
    await checkIcon(project.presentation?.icon);
    const path = resolve(root, project.manifest);
    const within = relative(root, path);
    if (within.startsWith("..") || isAbsolute(within)) throw new Error("Manifest fora de public/projects.");
    validateManifest(JSON.parse(await readFile(path, "utf8")), project.id);
  }
  for (const item of [...catalog.projects, ...catalog.categories, ...catalog.updates]) {
    if (!item.command) continue;
    const command = interpretCommand(item.command);
    if (command.type === "tp" && !registry.has(command.destination)) throw new Error(`Destino inexistente: ${command.destination}.`);
  }
  return { projects: catalog.projects.length, updates: catalog.updates.length };
}

async function main() {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: {
    id: { type: "string" }, name: { type: "string" }, category: { type: "string" }, tone: { type: "string" }, image: { type: "string" },
    file: { type: "string" }, "no-featured": { type: "boolean" }, project: { type: "string" }, date: { type: "string" },
    "title-pt": { type: "string" }, "title-en": { type: "string" }, "body-pt": { type: "string" }, "body-en": { type: "string" },
  } });
  const root = fileURLToPath(new URL("../public/projects", import.meta.url));
  if (positionals[0] === "check") {
    validateGitHubStats(JSON.parse(await readFile(new URL("../src/data/github-stats.json", import.meta.url), "utf8")));
    const profile = validateProfile(JSON.parse(await readFile(new URL("../src/data/profile.json", import.meta.url), "utf8")));
    if (profile.photo) await access(new URL(`../src/assets/${profile.photo.src}`, import.meta.url));
    validateInformation(JSON.parse(await readFile(new URL("../src/data/information.json", import.meta.url), "utf8")), home.information.map((item) => item.id));
    const resume = validateResume(JSON.parse(await readFile(new URL("../src/data/resume.json", import.meta.url), "utf8")));
    const catalog = checkedCatalog(JSON.parse(await readFile(join(root, "index.json"), "utf8")));
    for (const id of resume.selectedProjects) if (!catalog.projects.some((project) => project.id === id)) throw new Error(`Unknown resume project: ${id}.`);
    for (const id of resume.contactCards) if (!profile.cards.some((card) => card.id === id && card.type === "link" && card.href && card.published)) throw new Error(`Unknown resume contact: ${id}.`);
    return console.log(await checkContent(root));
  }
  const specification = values.file ? JSON.parse(await readFile(resolve(values.file), "utf8")) : {};
  const options = { ...specification, ...values };
  if (values["no-featured"]) options.featured = false;
  if (positionals[0] === "project") console.log(await addProject(root, options));
  else if (positionals[0] === "update") console.log(await addUpdate(root, options));
  else throw new Error("Use: npm run content -- project|update|check. Exemplos em docs_autoupdate/CONTENT_HELPER.md.");
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
