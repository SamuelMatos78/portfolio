import { CATEGORIES, COMPARATORS, WEAPONS, commandInfo, isCondition, isInstruction } from "./commands.js";
import { assertBlockBudget, duplicateBlock, insertBlock, moveBlock, removeBlock, setBlockCondition, setBlockParameter, valueAt } from "./block-model.js";

const el = (tag, className, text) => { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export class BlockEditor {
  constructor(host, catalog, onChange, onError, onHistory) {
    this.host = host; this.catalog = catalog; this.onChange = onChange; this.onError = onError; this.onHistory = onHistory;
    this.program = { schemaVersion: 1, body: [] }; this.activeLane = ["body"]; this.past = []; this.future = []; this.disabled = false;
  }
  load(program) {
    assertBlockBudget(program); this.program = structuredClone(program);
    const prepare = (list) => { for (const node of list) {
      if (node.op === 70 && !node.else) node.else = [];
      for (const key of ["body", "then", "else"]) if (node[key]) prepare(node[key]);
    } };
    prepare(this.program.body); this.past = []; this.future = []; this.activeLane = ["body"]; this.render();
  }
  setDisabled(disabled) { this.disabled = disabled; if (this.host.firstChild) this.host.firstChild.disabled = disabled; this.host.classList.toggle("locked", disabled); }
  commit(next) {
    if (this.disabled) return;
    this.past.push(this.program); if (this.past.length > 30) this.past.shift(); this.future = [];
    this.program = next; this.render(); this.onChange(structuredClone(next));
  }
  attempt(action) { if (this.disabled) return; try { this.commit(action()); } catch (error) { this.onError(error.message); } }
  add(id) { this.attempt(() => insertBlock(this.program, this.activeLane, id)); }
  undo() { if (!this.disabled && this.past.length) { this.future.push(this.program); this.program = this.past.pop(); this.render(); this.onChange(structuredClone(this.program)); } }
  redo() { if (!this.disabled && this.future.length) { this.past.push(this.program); this.program = this.future.pop(); this.render(); this.onChange(structuredClone(this.program)); } }
  render() {
    const scrollTop = this.host.scrollTop;
    try { if (!Array.isArray(valueAt(this.program, this.activeLane))) this.activeLane = ["body"]; } catch { this.activeLane = ["body"]; }
    const fieldset = el("fieldset", "block-fieldset"); fieldset.disabled = this.disabled;
    fieldset.append(this.lane(this.program.body, ["body"], "Programa dos humanos"));
    this.host.replaceChildren(fieldset); this.host.scrollTop = scrollTop;
    this.onHistory?.(this.past.length > 0, this.future.length > 0, assertBlockBudget(this.program));
  }
  action(text, title, callback) {
    const button = el("button", "block-action", text); button.type = "button"; button.title = title; button.setAttribute("aria-label", title);
    button.addEventListener("click", (event) => { event.stopPropagation(); callback(); }); return button;
  }
  dropTarget(target, destination, index) {
    target.addEventListener("dragover", (event) => {
      if (this.disabled || !event.dataTransfer.types.includes("application/x-codewar-block")) return;
      event.preventDefault(); event.stopPropagation(); event.dataTransfer.dropEffect = "move"; target.classList.add("drop-hover");
    });
    target.addEventListener("dragleave", () => target.classList.remove("drop-hover"));
    target.addEventListener("drop", (event) => {
      if (this.disabled) return;
      event.preventDefault(); event.stopPropagation(); target.classList.remove("drop-hover");
      try {
        const source = JSON.parse(event.dataTransfer.getData("application/x-codewar-block"));
        const position = typeof index === "function" ? index(event) : index;
        this.attempt(() => moveBlock(this.program, source, destination, position));
      } catch (error) { this.onError(error.message); }
    });
  }
  lane(list, path, title) {
    const section = el("section", `block-lane${same(path, this.activeLane) ? " active-lane" : ""}`);
    const header = el("div", "lane-header"), name = el("strong", "", title);
    const selectLane = this.action("＋ Aqui", "Usar esta área como destino dos próximos blocos", () => { this.activeLane = path; this.render(); });
    header.append(name, selectLane); section.append(header);
    if (!list.length) section.append(el("p", "empty-lane", "Adicione um bloco pelo menu ou arraste um bloco para cá."));
    list.forEach((node, index) => section.append(this.card(node, [...path, index], list.length)));
    const footer = el("div", "lane-add"), picker = el("select", ""); picker.setAttribute("aria-label", `Novo bloco em: ${title}`);
    for (const [category, label] of Object.entries(CATEGORIES)) {
      const entries = this.catalog.filter((block) => block.category === category && isInstruction(block.id));
      if (!entries.length) continue;
      const group = el("optgroup"); group.label = label;
      for (const entry of entries) { const option = el("option", "", commandInfo(entry.id).title); option.value = entry.id; group.append(option); }
      picker.append(group);
    }
    const add = this.action("Adicionar", `Adicionar bloco em ${title}`, () => { this.activeLane = path; this.add(Number(picker.value)); });
    footer.append(picker, add); section.append(footer); this.dropTarget(section, path, list.length); return section;
  }
  card(node, path, length) {
    const block = this.catalog.find((entry) => entry.id === node.op), info = commandInfo(node.op);
    const article = el("article", `strategy-block category-${block.category}`), top = el("div", "block-heading");
    const handle = el("span", "block-handle", "⠿"); handle.draggable = true; handle.title = "Arraste para mover este bloco";
    handle.addEventListener("dragstart", (event) => { if (this.disabled) { event.preventDefault(); return; } event.stopPropagation(); event.dataTransfer.setData("application/x-codewar-block", JSON.stringify(path)); event.dataTransfer.effectAllowed = "move"; });
    const title = el("strong", "", info.title), badge = el("small", "block-id", `#${node.op}`), actions = el("div", "block-actions");
    const index = path.at(-1), destination = path.slice(0, -1);
    const up = this.action("↑", `Mover ${info.title} para cima`, () => this.attempt(() => moveBlock(this.program, path, destination, index - 1))); up.disabled = index === 0;
    const down = this.action("↓", `Mover ${info.title} para baixo`, () => this.attempt(() => moveBlock(this.program, path, destination, index + 2))); down.disabled = index === length - 1;
    actions.append(up, down, this.action("⧉", `Duplicar ${info.title}`, () => this.attempt(() => duplicateBlock(this.program, path))), this.action("×", `Remover ${info.title}`, () => this.attempt(() => removeBlock(this.program, path))));
    top.append(handle, title, badge, actions); article.append(top);
    if (node.condition) {
      const condition = el("div", "block-condition");
      this.selectField(condition, "Condição", node.condition.op, this.catalog.filter((entry) => isCondition(entry.id)).map((entry) => [entry.id, commandInfo(entry.id).title]), (value) => this.attempt(() => setBlockCondition(this.program, path, Number(value))));
      this.parameters(condition, node.condition, [...path, "condition"]); article.append(condition);
    }
    const params = el("div", "block-params"); this.parameters(params, node, path); if (params.childNodes.length) article.append(params);
    if (node.op === 70) {
      article.append(this.lane(node.then, [...path, "then"], "Então · condição verdadeira"));
      article.append(this.lane(node.else ?? [], [...path, "else"], "Senão · condição falsa"));
    } else if (node.body) article.append(this.lane(node.body, [...path, "body"], node.op === 72 ? "Repetir estes blocos" : "Executar estes blocos"));
    this.dropTarget(article, destination, (event) => index + (event.clientY > article.getBoundingClientRect().top + article.getBoundingClientRect().height / 2 ? 1 : 0));
    return article;
  }
  selectField(container, labelText, value, options, onChange) {
    const label = el("label", "block-field"), caption = el("span", "", labelText), select = el("select");
    for (const [key, text] of options) { const option = el("option", "", text); option.value = String(key); select.append(option); }
    select.value = value === undefined ? "" : String(value); select.addEventListener("change", () => onChange(select.value));
    label.append(caption, select); container.append(label);
  }
  numberField(container, labelText, value, min, max, onChange, ticks = false) {
    const label = el("label", "block-field"), caption = el("span", "", labelText), input = el("input");
    input.type = "number"; input.min = min; input.max = max; input.step = ticks ? "any" : "1"; input.value = value;
    input.addEventListener("change", () => {
      const value = input.value === "" ? NaN : Number(input.value);
      if (!Number.isFinite(value) || value < min || value > max || (!ticks && !Number.isInteger(value)) || (ticks && !Number.isInteger(value * 14))) {
        input.setCustomValidity(ticks ? "Use de 0 a 180 segundos, em múltiplos de 1/14 segundo." : `Use um inteiro de ${min} a ${max}.`);
        input.reportValidity(); return;
      }
      input.setCustomValidity(""); onChange(value);
    });
    label.append(caption, input); container.append(label);
  }
  parameters(container, node, path) {
    const change = (key, value) => this.attempt(() => setBlockParameter(this.program, path, key, value));
    if ([23, 31, 68].includes(node.op)) this.selectField(container, "Arma", node.weapon, node.op === 68 ? [["", "Qualquer arma"], ...WEAPONS] : WEAPONS, (value) => change("weapon", value || undefined));
    if (node.op === 58) this.selectField(container, "Recursos para", node.item, [["", "Qualquer arma"], ...WEAPONS, ["armory", "Armaria"], ["hospital", "Enfermaria"]], (value) => change("item", value || undefined));
    if (node.op >= 80 && node.op <= 84) this.numberField(container, "Células", node.steps ?? 1, 1, 100, (value) => change("steps", value));
    if (node.op === 77) this.numberField(container, "Segundos", node.seconds, 0, 180, (value) => change("seconds", value), true);
    if ([106, 107].includes(node.op)) {
      this.selectField(container, "Comparação", node.comparator, COMPARATORS, (value) => change("comparator", value));
      const mode = typeof node.value === "number" ? "fixed" : String(node.value.op);
      this.selectField(container, "Comparar com", mode, [["fixed", "Número fixo"], ["59", "Número de aliados"], ["60", "Número de inimigos"]], (value) => change("value", value === "fixed" ? 2 : { op: Number(value) }));
      if (mode === "fixed") this.numberField(container, "Quantidade", node.value, 0, 10, (value) => change("value", value));
    }
  }
}
