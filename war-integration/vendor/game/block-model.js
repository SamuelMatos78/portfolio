import { defaultNode, isCondition } from "./commands.js";

function pathAllowed(path) {
  if (!Array.isArray(path) || path.length > 96 || path.some((key) => typeof key === "number"
    ? !Number.isInteger(key) || key < 0 || key > 2000 : !["body", "then", "else", "condition", "value"].includes(key))) throw new Error("Caminho de bloco inválido.");
}
export function valueAt(program, path) {
  pathAllowed(path);
  let value = program;
  for (const key of path) {
    if (!value || !Object.hasOwn(value, key)) throw new Error("O bloco selecionado não existe mais.");
    value = value[key];
  }
  return value;
}

export function assertBlockBudget(program) {
  let count = 0;
  const seen = new WeakSet();
  const visit = (node, depth) => {
    if (!node || typeof node !== "object" || Array.isArray(node)) throw new Error("Bloco inválido.");
    if (seen.has(node)) throw new Error("Os blocos não podem formar ciclos.");
    seen.add(node);
    if (++count > 2000) throw new Error("O programa aceita até 2000 blocos.");
    if (depth > 32) throw new Error("O programa aceita até 32 níveis de aninhamento.");
    if (node.condition) visit(node.condition, depth + 1);
    if (node.value && typeof node.value === "object") visit(node.value, depth + 1);
    for (const key of ["body", "then", "else"]) if (node[key]) {
      if (!Array.isArray(node[key])) throw new Error("A sequência de blocos é inválida.");
      for (const child of node[key]) visit(child, depth + 1);
    }
    seen.delete(node);
  };
  if (program?.schemaVersion !== 1 || !Array.isArray(program.body)) throw new Error("Programa inválido.");
  for (const node of program.body) visit(node, 0);
  return count;
}

function edit(program, apply) { const copy = structuredClone(program); apply(copy); assertBlockBudget(copy); return copy; }
function listAt(program, path) { const list = valueAt(program, path); if (!Array.isArray(list)) throw new Error("Escolha uma sequência de blocos."); return list; }
function nodePosition(program, path) {
  pathAllowed(path);
  const index = path.at(-1), list = listAt(program, path.slice(0, -1));
  if (!Number.isInteger(index) || index < 0 || index >= list.length) throw new Error("Posição de bloco inválida.");
  return { list, index };
}
export function insertBlock(program, lane, id) { return edit(program, (copy) => listAt(copy, lane).push(defaultNode(id))); }
export function removeBlock(program, path) { return edit(program, (copy) => { const { list, index } = nodePosition(copy, path); list.splice(index, 1); }); }
export function duplicateBlock(program, path) { return edit(program, (copy) => { const { list, index } = nodePosition(copy, path); list.splice(index + 1, 0, structuredClone(list[index])); }); }
export function moveBlock(program, from, destination, insertionIndex) {
  if (from.every((part, index) => part === destination[index])) throw new Error("Um bloco não pode ser colocado dentro de si mesmo.");
  return edit(program, (copy) => {
    const { list, index } = nodePosition(copy, from), target = listAt(copy, destination);
    if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > target.length) throw new Error("Destino de bloco inválido.");
    const [node] = list.splice(index, 1);
    const position = list === target && index < insertionIndex ? insertionIndex - 1 : insertionIndex;
    target.splice(position, 0, node);
  });
}
export function setBlockParameter(program, path, key, value) {
  if (!["weapon", "item", "steps", "seconds", "comparator", "value"].includes(key)) throw new Error("Parâmetro desconhecido.");
  return edit(program, (copy) => { const node = valueAt(copy, path); if (value === undefined) delete node[key]; else node[key] = value; });
}
export function setBlockCondition(program, path, id) {
  if (!isCondition(id)) throw new Error("Escolha uma condição booleana.");
  return edit(program, (copy) => { valueAt(copy, path).condition = defaultNode(id); });
}
