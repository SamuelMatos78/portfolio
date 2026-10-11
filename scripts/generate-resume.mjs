import PDFDocument from "pdfkit";
import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve, join } from "node:path";
import { validateProfile } from "../src/profile/validation.ts";
import { validateInformation } from "../src/runtime/information.ts";
import { validateResume } from "../src/resume/validation.ts";
import { validateCatalog } from "../src/projects/validation.ts";

const root = fileURLToPath(new URL("../", import.meta.url));
const readJSON = async (path) => JSON.parse(await readFile(join(root, path), "utf8"));
const localize = (value, locale) => typeof value === "string" ? value : value?.[locale] ?? "";
const fonts = fileURLToPath(new URL("./assets/fonts/", import.meta.url));

export async function generateResume(outputDirectory = join(root, "public/resume")) {
  const [rawProfile, rawResume, rawInformation, home, rawCatalog] = await Promise.all([
    readJSON("src/data/profile.json"), readJSON("src/data/resume.json"), readJSON("src/data/information.json"), readJSON("src/data/home.json"), readJSON("public/projects/index.json"),
  ]);
  const profile = validateProfile(rawProfile);
  const resume = validateResume(rawResume);
  const information = validateInformation(rawInformation, home.information.map((item) => item.id));
  const resumePages = home.information.filter((item) => item.content === "resume");
  if (resumePages.length !== 1) throw new Error("Register exactly one resume page in home.information.");
  const sections = information[resumePages[0].id];
  if (!sections?.length) throw new Error("Resume sections are missing.");
  const catalog = validateCatalog(rawCatalog);
  const projects = resume.selectedProjects.map((id) => {
    const project = catalog.projects.find((item) => item.id === id);
    if (!project) throw new Error(`Unknown resume project: ${id}.`);
    return project;
  });
  const contacts = resume.contactCards.map((id) => {
    const card = profile.cards.find((item) => item.id === id && item.type === "link" && item.href && item.published);
    if (!card) throw new Error(`Unknown resume contact: ${id}.`);
    return card;
  });
  await mkdir(outputDirectory, { recursive: true });
  const results = [];
  for (const locale of ["pt", "en"]) {
    const text = (value) => localize(value, locale);
    const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: `${profile.name} — ${locale === "pt" ? "Currículo" : "Résumé"}`, Author: profile.name, Subject: text(resume.role), Creator: "Samuel Matos/domain" } });
    const chunks = [];
    const completed = new Promise((resolve, reject) => { doc.on("data", (chunk) => chunks.push(chunk)); doc.once("end", () => resolve(Buffer.concat(chunks))); doc.once("error", reject); });
    doc.registerFont("Body", join(fonts, "DejaVuSans.ttf"));
    doc.registerFont("Heading", join(fonts, "DejaVuSans-Bold.ttf"));
    const width = doc.page.width - 84;
    const bottom = doc.page.height - 64;
    let y = 42;
    const ensure = (height) => {
      if (y + height <= bottom) return;
      doc.addPage();
      doc.fillColor("#9aaea2").font("Body").fontSize(7).text(profile.name, 42, 30, { width, lineBreak: false });
      y = 58;
    };
    const paragraph = (content, { size = 8.5, color = "#465c51", gap = 6, link, bold = false } = {}) => {
      if (!content) return;
      doc.font(bold ? "Heading" : "Body").fontSize(size);
      const height = doc.heightOfString(content, { width, lineGap: 2 });
      ensure(height);
      doc.fillColor(color).text(content, 42, y, { width, lineGap: 2, ...(link ? { link } : {}) });
      y = doc.y + gap;
    };
    const heading = (label, minimumHeight = 65) => {
      ensure(minimumHeight);
      y += 6;
      doc.fillColor("#294c3b").font("Heading").fontSize(10).text(label, 42, y, { width });
      y = doc.y + 5;
      doc.moveTo(42, y).lineTo(doc.page.width - 42, y).lineWidth(.5).strokeColor("#d6dfd4").stroke();
      y += 8;
    };
    doc.rect(42, y, width, 3).fill("#294c3b");
    y += 18;
    doc.fillColor("#6c7c6b").font("Body").fontSize(7).text(locale === "pt" ? "CURRÍCULO / ENGENHARIA / PESQUISA" : "RÉSUMÉ / ENGINEERING / RESEARCH", 42, y, { width: width - 110 });
    y += 21;
    const firstName = profile.name.split(" ")[0];
    doc.font("Heading").fontSize(29).fillColor("#18372b").text(firstName, 42, y, { width: width - 112 });
    y = doc.y + 1;
    doc.fontSize(18).text(profile.name.slice(firstName.length).trim(), 42, y, { width: width - 112 });
    y = doc.y + 8;
    doc.font("Body").fontSize(9).fillColor("#6c7159").text(text(resume.role), 42, y, { width: width - 112 });
    y = doc.y + 12;
    doc.fontSize(8.5).fillColor("#465c51").text(text(profile.summary), 42, y, { width: width - 112, lineGap: 2 });
    y = Math.max(doc.y + 14, 200);
    if (profile.photo) {
      const photo = await readFile(join(root, "src/assets", profile.photo.src));
      doc.save().rect(doc.page.width - 134, 74, 92, 123).clip();
      doc.image(photo, doc.page.width - 134, 74, { fit: [92, 123], align: "center", valign: "center" });
      doc.restore();
    }
    for (const contact of contacts) paragraph(`${text(contact.title)}: ${contact.href.replace(/^https?:\/\//, "")}`, { size: 7.5, color: "#294c3b", link: contact.href, gap: 5 });
    y += 4;
    for (const section of sections) {
      heading(text(section.title));
      switch (section.type) {
        case "text": paragraph(text(section.body)); break;
        case "hero": paragraph(text(section.description)); break;
        case "stats":
          for (const item of section.items) {
            doc.font("Body").fontSize(8.5);
            const note = text(item.note);
            ensure(22 + (note ? doc.heightOfString(note, { width, lineGap: 2 }) : 0));
            paragraph(`${text(item.label)}  /  ${text(item.value)}`, { size: 9, bold: true, color: "#294c3b", gap: 4 });
            paragraph(note, { gap: 6 });
          }
          break;
        case "links":
          for (const item of section.items) paragraph(`${text(item.label)}${item.href ? ` — ${item.href.replace(/^https?:\/\//, "")}` : ""}`, { size: 7.5, color: "#294c3b", link: item.href, gap: 5 });
          break;
        case "gallery": for (const item of section.items) paragraph(text(item.caption)); break;
      }
    }
    if (projects.length) {
      heading(locale === "pt" ? "Projetos selecionados" : "Selected projects", 90);
      for (const project of projects) {
        ensure(36);
        paragraph(project.identity.name, { bold: true, size: 9, color: "#294c3b", gap: 3 });
        paragraph(text(project.identity.subtitle), { gap: 5 });
      }
    }
    const { start, count } = doc.bufferedPageRange();
    for (let page = start; page < start + count; page++) {
      doc.switchToPage(page);
      const footerY = doc.page.height - 55;
      doc.font("Body").fontSize(6.5).fillColor("#849386").text("Samuel Matos/domain", 42, footerY, { lineBreak: false });
      doc.text(`${page + 1} / ${count}  ·  ${locale.toUpperCase()}`, doc.page.width - 110, footerY, { width: 68, align: "right", lineBreak: false });
    }
    doc.end();
    const buffer = await completed;
    const path = join(outputDirectory, resume.documents[locale]);
    const temporary = `${path}.tmp-${process.pid}`;
    try { await writeFile(temporary, buffer); await rename(temporary, path); }
    finally { await rm(temporary, { force: true }); }
    results.push({ locale, filename: resume.documents[locale], pages: count });
  }
  return results;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  await generateResume().then((result) => console.log(result)).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
