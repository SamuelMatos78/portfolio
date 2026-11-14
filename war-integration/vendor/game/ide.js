import { BlockEditor } from "./block-editor.js";
import { CATEGORIES, commandInfo, defaultNode, isCondition, isInstruction } from "./commands.js";
import { programToSource, sourceToProgram } from "./strategy-language.js";

const $ = (id) => document.getElementById(id);
const normalize = (text) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };

export class StrategyIDE {
  constructor({ catalog, api, message, onDraft, canEdit }) {
    this.catalog = catalog; this.api = api; this.message = message; this.onDraft = onDraft; this.canEdit = canEdit;
    this.mode = "code"; this.lastBlockText = null; this.busy = false;
    this.builder = new BlockEditor($("blockCanvas"), catalog, (program) => {
      this.lastBlockText = programToSource(program, this.catalog);
      $("humanCode").value = this.lastBlockText; this.onDraft(); this.message("Blocos atualizados. O código foi sincronizado.", "success");
    }, (error) => this.message(error, "error"), (undo, redo, count) => {
      $("blocksUndo").disabled = !undo || !this.canEdit(); $("blocksRedo").disabled = !redo || !this.canEdit();
      $("blockCount").textContent = `${count} bloco${count === 1 ? "" : "s"}`;
    });
    $("codeMode").addEventListener("click", () => this.switchMode("code"));
    $("blocksMode").addEventListener("click", () => this.switchMode("blocks"));
    $("blocksUndo").addEventListener("click", () => this.builder.undo());
    $("blocksRedo").addEventListener("click", () => this.builder.redo());
    $("blocksEmpty").addEventListener("click", () => this.builder.attempt(() => ({ schemaVersion: 1, body: [] })));
    $("commandSearch").addEventListener("input", () => this.showCommands());
    $("commandCategory").addEventListener("change", () => this.showCommands());
    $("editorFontSize").addEventListener("change", () => { $("workshop").style.setProperty("--code-font", `${$("editorFontSize").value}px`); this.syncScroll(); });
    $("expandIDE").addEventListener("click", () => this.expand(!$("workshop").classList.contains("ide-focused")));
    $("humanCode").addEventListener("scroll", () => this.syncScroll());
    $("workshop").addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.expand(false);
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); if (this.canEdit()) $("validateCode").click(); }
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "f") { event.preventDefault(); if (this.canEdit()) $("formatCode").click(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); this.onDraft(); this.message("Rascunho salvo neste navegador.", "success"); }
    });
    for (const [key, label] of Object.entries(CATEGORIES)) { const option = el("option", "", label); option.value = key; $("commandCategory").append(option); }
    this.showCommands(); this.syncFromCode();
  }
  expand(expanded) {
    $("workshop").classList.toggle("ide-focused", expanded); document.body.classList.toggle("ide-open", expanded);
    $("expandIDE").textContent = expanded ? "↙ Voltar à arena" : "⛶ Ampliar IDE";
    $("expandIDE").setAttribute("aria-pressed", String(expanded));
  }
  syncScroll() {
    $("syntaxHighlight").scrollTop = $("humanCode").scrollTop; $("syntaxHighlight").scrollLeft = $("humanCode").scrollLeft;
    $("lineNumbers").scrollTop = $("humanCode").scrollTop;
  }
  syncFromCode() {
    const source = $("humanCode").value;
    if (this.mode === "blocks" && source !== this.lastBlockText) this.showMode("code");
    const pre = $("syntaxHighlight"); pre.replaceChildren();
    if (source.length > 200_000) { pre.textContent = source; this.syncScroll(); return; }
    const knownNames = new Set(this.catalog.flatMap((entry) => [entry.alias, entry.symbol, entry.nameEn].filter(Boolean).map(normalize)));
    const tokens = /\/\/[^\r\n]*|#[^\r\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b|[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_-]*|[{}(),;:=]/g;
    const fragment = document.createDocumentFragment(); let index = 0;
    for (const match of source.matchAll(tokens)) {
      fragment.append(document.createTextNode(source.slice(index, match.index)));
      const token = match[0], normalized = normalize(token);
      const kind = token.startsWith("//") || token.startsWith("#") ? "syntax-comment" : /^["']/.test(token) ? "syntax-string" : /^\d/.test(token) ? "syntax-number" : ["if", "else", "while", "repeat_forever", "repeat_until"].includes(normalized) ? "syntax-keyword" : knownNames.has(normalized) ? "syntax-command" : "syntax-punctuation";
      const span = el("span", kind, token);
      fragment.append(span); index = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(source.slice(index) + (source.endsWith("\n") ? " " : ""))); pre.append(fragment); this.syncScroll();
  }
  showMode(mode) {
    this.mode = mode; $("codePanel").hidden = mode !== "code"; $("blockPanel").hidden = mode !== "blocks";
    for (const [id, value] of [["codeMode", "code"], ["blocksMode", "blocks"]]) {
      $(id).setAttribute("aria-selected", String(mode === value)); $(id).classList.toggle("selected", mode === value);
    }
    $("editorModeName").textContent = mode === "code" ? "estrategia.cw" : "estrategia.blocos";
  }
  async switchMode(mode) {
    if (!this.canEdit() || this.busy) return false;
    if (mode === "code") { this.showMode("code"); return true; }
    if (this.mode === "blocks") return true;
    this.busy = true; this.setDisabled(true); const source = $("humanCode").value;
    try {
      const program = sourceToProgram(source, this.catalog);
      const result = await this.api("/api/game/validate", { program });
      if (!this.canEdit() || source !== $("humanCode").value) return false;
      this.builder.load(result.program); this.lastBlockText = source; this.showMode("blocks");
      this.message("Monte a estratégia por blocos. Use os menus, as setas ou arraste para reorganizar.", "success"); return true;
    } catch (error) { this.message(`Revise o código antes de abrir os blocos: ${error.message}`, "error"); return false; }
    finally { this.busy = false; this.setDisabled(!this.canEdit()); }
  }
  setDisabled(disabled) {
    this.builder.setDisabled(disabled); $("codeMode").disabled = disabled; $("blocksMode").disabled = disabled;
    $("blocksEmpty").disabled = disabled;
    $("blocksUndo").disabled = disabled || !this.builder.past.length; $("blocksRedo").disabled = disabled || !this.builder.future.length;
    document.querySelectorAll(".insert-command").forEach((button) => { button.disabled = disabled; });
  }
  async addCommand(id) { if (this.canEdit() && await this.switchMode("blocks")) this.builder.add(id); }
  showCommands() {
    const search = normalize($("commandSearch").value), category = $("commandCategory").value;
    const filtered = this.catalog.filter((entry) => {
      const info = commandInfo(entry.id);
      return (!category || entry.category === category) && normalize(`${entry.id} ${entry.symbol} ${entry.alias} ${entry.nameEn} ${info.title} ${info.description}`).includes(search);
    });
    $("commandResults").textContent = `${filtered.length} de ${this.catalog.length} comandos`;
    const fragment = document.createDocumentFragment();
    for (const entry of filtered) {
      const info = commandInfo(entry.id), card = el("article", `command-card category-${entry.category}`), heading = el("div", "command-card-heading");
      heading.append(el("strong", "", info.title), el("span", "command-badge", `#${entry.id}`));
      const tag = el("span", "command-category", `${CATEGORIES[entry.category]}${isCondition(entry.id) ? " · condição" : entry.id === 59 || entry.id === 60 ? " · expressão numérica" : ""}`);
      const example = programToSource({ schemaVersion: 1, body: [defaultNode(entry.id)] }, this.catalog);
      card.append(heading, tag, el("code", "command-alias", example.split("\n")[0]), el("p", "", info.description)); if (info.tip) card.append(el("p", "command-tip", info.tip));
      const details = el("details", "command-example"), summary = el("summary", "", "Ver exemplo completo"), pre = el("pre", "", example); details.append(summary, pre); card.append(details);
      const actions = el("div", "command-card-actions"), copy = el("button", "", "Copiar código");
      copy.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(pre.textContent); this.message(`Código de ${info.title} copiado.`, "success"); }
        catch { details.open = true; this.message("Selecione e copie o exemplo de código exibido no cartão."); }
      }); actions.append(copy);
      if (isInstruction(entry.id)) {
        const add = el("button", "insert-command", "＋ Usar bloco"); add.disabled = !this.canEdit(); add.addEventListener("click", () => this.addCommand(entry.id)); actions.append(add);
      }
      card.append(actions); fragment.append(card);
    }
    if (!filtered.length) fragment.append(el("p", "empty-commands", "Nenhum comando encontrado. Tente outro nome, ID ou categoria."));
    $("commandList").replaceChildren(fragment);
  }
  readProgram() { return sourceToProgram($("humanCode").value, this.catalog); }
  formatCode() {
    const formatted = programToSource(this.readProgram(), this.catalog);
    $("humanCode").value = formatted; this.onDraft();
    this.message("Código formatado.", "success");
  }
}
