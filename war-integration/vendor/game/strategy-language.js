import { defaultNode, isCondition } from "./commands.js";

const normalizeName = (value) => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const lineError = (token, message) => new Error(`Linha ${token?.line ?? 1}: ${message}`);

function catalogMaps(catalog) {
  const byName = new Map();
  const byId = new Map();
  for (const entry of catalog) {
    byId.set(Number(entry.id), entry);
    for (const name of [entry.alias, entry.symbol, entry.nameEn]) {
      if (name) byName.set(normalizeName(name), entry);
    }
  }
  return { byName, byId };
}

function tokenize(source) {
  const tokens = [];
  const pattern = /\s+|\/\/[^\r\n]*|#[^\r\n]*|(?:\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|[A-Za-zÀ-ÿ_][A-Za-zÀ-ÿ0-9_-]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[{}(),;:=]/y;
  let index = 0, line = 1;
  while (index < source.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(source);
    if (!match) throw lineError({ line }, `Caractere inesperado “${source[index]}”.`);
    const value = match[0], tokenLine = line;
    line += (value.match(/\n/g) ?? []).length;
    index = pattern.lastIndex;
    if (/^\s+$/.test(value) || value.startsWith("//") || value.startsWith("#")) continue;
    const type = /^\d/.test(value) ? "number" : /^["']/.test(value) ? "string" : /^[A-Za-zÀ-ÿ_]/.test(value) ? "name" : value;
    tokens.push({ type, value, line: tokenLine });
  }
  tokens.push({ type: "eof", value: "fim do código", line });
  return tokens;
}

class StrategyParser {
  constructor(source, catalog) {
    this.tokens = tokenize(source);
    this.cursor = 0;
    this.maps = catalogMaps(catalog);
  }
  peek(offset = 0) { return this.tokens[this.cursor + offset] ?? this.tokens.at(-1); }
  take() { return this.tokens[this.cursor++]; }
  match(value) { if (this.peek().value === value) { this.take(); return true; } return false; }
  expect(value, description = `“${value}”`) {
    const token = this.take();
    if (token.value !== value) throw lineError(token, `Esperado ${description}.`);
    return token;
  }
  expectName(description = "nome de comando") {
    const token = this.take();
    if (token.type !== "name") throw lineError(token, `Esperado ${description}.`);
    return token;
  }
  resolve(token) {
    const entry = this.maps.byName.get(normalizeName(token.value));
    if (!entry) throw lineError(token, `Comando “${token.value}” não encontrado. Consulte a biblioteca de comandos.`);
    return Number(entry.id);
  }
  parse() {
    const body = this.parseStatements(false);
    if (this.peek().type !== "eof") throw lineError(this.peek(), "Há código depois do fim da estratégia.");
    return { schemaVersion: 1, body };
  }
  parseStatements(inBlock) {
    const body = [];
    while (this.peek().type !== "eof" && this.peek().value !== "}") {
      body.push(this.parseStatement());
    }
    if (inBlock && this.peek().type === "eof") throw lineError(this.peek(), "Bloco sem “}” de fechamento.");
    if (!inBlock && this.peek().value === "}") throw lineError(this.peek(), "“}” sem bloco aberto.");
    return body;
  }
  parseBlock() {
    this.expect("{", "“{” para iniciar um bloco");
    const body = this.parseStatements(true);
    this.expect("}");
    return body;
  }
  parseStatement() {
    const name = this.expectName();
    const id = this.resolve(name);
    const { args, hadParens } = this.parseArguments();
    if (id === 70) {
      const node = defaultNode(id);
      node.condition = this.conditionFromArgs(args, name);
      node.then = this.parseBlock();
      if (this.peek().type === "name" && normalizeName(this.peek().value) === "else") {
        this.take();
        node.else = this.parseBlock();
      } else delete node.else;
      this.match(";");
      return node;
    }
    if (id === 73 || id === 74) {
      const node = defaultNode(id);
      node.condition = this.conditionFromArgs(args, name);
      node.body = this.parseBlock();
      this.match(";");
      return node;
    }
    if (id === 72 || id === 71) {
      if (args.length) throw lineError(name, `“${name.value}” não recebe parâmetros.`);
      const node = defaultNode(id);
      node.body = this.parseBlock();
      this.match(";");
      return node;
    }
    if ([59, 60].includes(id)) throw lineError(name, "Use a contagem dentro de compare_ally_count ou compare_enemy_count.");
    if (isCondition(id)) throw lineError(name, "Uma condição precisa estar dentro de if, while ou repeat_until.");
    const node = defaultNode(id);
    this.applyArguments(node, args, name, hadParens);
    this.match(";");
    return node;
  }
  parseArguments() {
    if (!this.match("(")) return { args: [], hadParens: false };
    const args = [];
    while (!this.match(")")) {
      if (this.peek().type === "eof") throw lineError(this.peek(), "Parâmetros sem “)” de fechamento.");
      let name;
      if (this.peek().type === "name" && [":", "="].includes(this.peek(1).value)) {
        name = this.take().value.toLowerCase(); this.take();
      }
      args.push({ name, value: this.parseValue() });
      if (this.match(")")) break;
      this.expect(",", "vírgula entre parâmetros");
    }
    return { args, hadParens: true };
  }
  parseValue() {
    const token = this.take();
    if (token.type === "number") return Number(token.value);
    if (token.type === "string") {
      if (token.value.startsWith('"')) {
        try { return JSON.parse(token.value); } catch { throw lineError(token, "Texto entre aspas inválido."); }
      }
      return token.value.slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, "\\");
    }
    if (token.type !== "name") throw lineError(token, "Esperado um valor ou nome de condição.");
    const entry = this.maps.byName.get(normalizeName(token.value));
    if (entry && [59, 60].includes(Number(entry.id)) && this.peek().value === "(") {
      const { args } = this.parseArguments();
      if (args.length) throw lineError(token, "A contagem não recebe parâmetros.");
      return { op: Number(entry.id) };
    }
    if (entry && isCondition(Number(entry.id)) && Number(entry.id) !== 59 && Number(entry.id) !== 60) {
      const id = Number(entry.id);
      if (this.peek().value === "(") {
        const { args } = this.parseArguments();
        const node = defaultNode(id); this.applyArguments(node, args, token, true); return node;
      }
      return defaultNode(id);
    }
    return token.value;
  }
  conditionFromArgs(args, token) {
    const positional = args.find((arg) => !arg.name);
    const named = args.find((arg) => arg.name === "condition");
    if (args.some((arg) => arg.name && arg.name !== "condition")) throw lineError(token, "O único parâmetro de condição é “condition”.");
    const value = named?.value ?? positional?.value;
    if (args.filter((arg) => !arg.name).length > 1 || args.filter((arg) => arg.name === "condition").length > 1) throw lineError(token, "Informe apenas uma condição.");
    let node = value;
    if (typeof node === "string") {
      const entry = this.maps.byName.get(normalizeName(node));
      if (entry && isCondition(Number(entry.id)) && ![59, 60].includes(Number(entry.id))) node = defaultNode(Number(entry.id));
    }
    if (!node || typeof node !== "object" || !isCondition(Number(node.op)) || [59, 60].includes(Number(node.op))) {
      throw lineError(token, "Use uma condição da biblioteca entre parênteses, por exemplo if (enemy_visible) { … }.");
    }
    return node;
  }
  applyArguments(node, args, token, hadParens) {
    const id = Number(node.op);
    if (!args.length) return;
    const fields = id === 23 || id === 31 ? ["weapon"] : id === 68 ? ["weapon"] : id === 58 ? ["item"] : id === 77 ? ["seconds"] : id >= 80 && id <= 84 ? ["steps"] : [106, 107].includes(id) ? ["comparator", "value"] : [];
    if (!fields.length) throw lineError(token, hadParens ? "Este comando não recebe parâmetros." : "Parâmetro inesperado.");
    const assigned = new Set();
    for (const [index, arg] of args.entries()) {
      const field = arg.name ?? fields[index];
      if (!fields.includes(field)) throw lineError(token, `Parâmetro “${field}” não é válido para este comando.`);
      if (assigned.has(field)) throw lineError(token, `Parâmetro “${field}” repetido.`);
      assigned.add(field);
      const value = arg.value;
      if (field === "weapon" && !["sword", "spear", "axe"].includes(value)) throw lineError(token, "Arma inválida. Use sword, spear ou axe.");
      if (field === "item" && !["sword", "spear", "axe", "armory", "hospital"].includes(value)) throw lineError(token, "Recurso inválido. Use sword, spear, axe, armory ou hospital.");
      if (field === "seconds" && (typeof value !== "number" || value < 0 || value > 180 || !Number.isInteger(value * 14))) throw lineError(token, "Use de 0 a 180 segundos em múltiplos de 1/14.");
      if (field === "steps" && (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 100)) throw lineError(token, "Use de 1 a 100 células.");
      if (field === "comparator" && !["eq", "neq", "gt", "gte", "lt", "lte"].includes(value)) throw lineError(token, "Comparação inválida. Use eq, neq, gt, gte, lt ou lte.");
      if (field === "value" && !(typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 10) && !([59, 60].includes(Number(value?.op)))) throw lineError(token, "Compare com um número de 0 a 10, ally_count() ou enemy_count().");
      node[field] = value;
    }
    for (const required of id === 23 || id === 31 ? ["weapon"] : [106, 107].includes(id) ? ["comparator", "value"] : []) {
      if (!assigned.has(required) && node[required] === undefined) throw lineError(token, `Informe o parâmetro “${required}”.`);
    }
  }
}

function opId(value, maps) {
  const numeric = Number(value);
  if (Number.isInteger(numeric) && maps.byId.has(numeric)) return numeric;
  return maps.byName.get(normalizeName(value))?.id;
}

function commandName(id, maps) {
  return maps.byId.get(Number(id))?.alias ?? maps.byId.get(Number(id))?.symbol?.toLowerCase() ?? `command_${id}`;
}

function valueSource(value, maps) {
  if (typeof value === "number") return String(value);
  if (value && typeof value === "object" && [59, 60].includes(opId(value.op, maps))) return `${commandName(opId(value.op, maps), maps)}()`;
  return String(value);
}

function nodeSource(node, maps, indent = 0) {
  const id = opId(node.op, maps);
  if (!id) throw new Error(`Comando desconhecido no programa: ${node.op}.`);
  const pad = " ".repeat(indent), name = commandName(id, maps);
  const conditionSource = (condition) => nodeSource(condition, maps).trim().replace(/;$/, "");
  const block = (body) => ` {\n${(body ?? []).map((child) => nodeSource(child, maps, indent + 2)).join("\n")}\n${pad}}`;
  if (id === 70) {
    const text = `${pad}if (${conditionSource(node.condition)})${block(node.then)}`;
    return node.else ? `${text} else${block(node.else)}` : text;
  }
  if (id === 71 || id === 72) return `${pad}${name}${block(node.body)}`;
  if (id === 73 || id === 74) return `${pad}${name} (${conditionSource(node.condition)})${block(node.body)}`;
  const args = [];
  if ([23, 31].includes(id) && node.weapon !== undefined) args.push(node.weapon);
  else if (id === 68 && node.weapon !== undefined) args.push(`weapon: ${node.weapon}`);
  if (id === 58 && node.item !== undefined) args.push(node.item);
  if (id === 77 && node.seconds !== undefined) args.push(valueSource(node.seconds, maps));
  if (id >= 80 && id <= 84) args.push(valueSource(node.steps ?? 1, maps));
  if ([106, 107].includes(id)) args.push(node.comparator ?? "gte", valueSource(node.value ?? 2, maps));
  return `${pad}${name}(${args.join(", ")});`;
}

export function sourceToProgram(source, catalog) {
  const trimmed = source.trim();
  if (trimmed.startsWith("{")) {
    let program;
    try { program = JSON.parse(trimmed); } catch (error) { throw new Error(`Estratégia inválida: ${error.message}`); }
    if (!program || typeof program !== "object" || Array.isArray(program) || !Array.isArray(program.body)) throw new Error("A estratégia precisa ter uma lista de comandos.");
    return program;
  }
  return new StrategyParser(source, catalog).parse();
}

export function programToSource(program, catalog) {
  const maps = catalogMaps(catalog);
  if (!program || !Array.isArray(program.body)) throw new Error("A estratégia precisa ter uma lista de comandos.");
  return program.body.map((node) => nodeSource(node, maps)).join("\n");
}
