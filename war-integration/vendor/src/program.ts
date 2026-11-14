import { BLOCK_CATALOG, resolveBlockId } from "./catalog.ts";
import type { Program, ProgramNode, ValidationIssue, ValidationResult, WeaponType } from "./types.ts";

export const PROGRAM_SCHEMA_VERSION = 1;
export const MAX_PROGRAM_DEPTH = 32;
export const MAX_PROGRAM_NODES = 2_000;
export const MAX_DECISION_OPERATIONS = 256;

const knownIds = new Set<number>(BLOCK_CATALOG.map((block) => block.id));
const conditionIds = new Set<number>([
  ...Array.from({ length: 9 }, (_, index) => index + 50),
  ...Array.from({ length: 9 }, (_, index) => index + 61),
  103, 104, 105, 106, 107, 108, 109,
]);
const weaponTypes = new Set<WeaponType>(["sword", "spear", "axe"]);
const comparators = new Set(["eq", "neq", "gt", "gte", "lt", "lte"]);

export interface ProgramJsonSchema {
  $schema: string;
  $id: string;
  title: string;
  type: "object";
  additionalProperties: false;
  required: string[];
  properties: Record<string, unknown>;
  $defs: Record<string, unknown>;
}

function nodeSchema(id: number, acceptNames = false): Record<string, unknown> {
  const block = BLOCK_CATALOG.find((item) => item.id === id)!;
  const opSchema = acceptNames
    ? { description: "Block ID, Portuguese symbol, English alias, or English name.", anyOf: [{ const: id }, { enum: [block.symbol, block.alias, block.nameEn] }] }
    : { const: id };
  const props: Record<string, unknown> = { op: opSchema };
  const required = ["op"];
  const arrayRef = { type: "array", maxItems: MAX_PROGRAM_NODES, items: { $ref: "#/$defs/node" } };
  if (id === 70) {
    props.condition = { $ref: "#/$defs/condition" };
    props.then = arrayRef;
    props.else = arrayRef;
    required.push("condition", "then");
  } else if ([71, 72].includes(id)) {
    props.body = arrayRef;
    required.push("body");
  } else if ([73, 74].includes(id)) {
    props.condition = { $ref: "#/$defs/condition" };
    props.body = arrayRef;
    required.push("condition", "body");
  } else if (id === 77) {
    props.seconds = { type: "number", minimum: 0, maximum: 180 };
    required.push("seconds");
  } else if (id === 31) {
    props.weapon = { enum: ["sword", "spear", "axe"] };
    required.push("weapon");
  } else if (id >= 80 && id <= 84) {
    props.steps = { type: "integer", minimum: 1, maximum: 100 };
  } else if (id === 68) {
    props.weapon = { enum: ["sword", "spear", "axe"] };
  } else if (id === 23) {
    props.weapon = { enum: ["sword", "spear", "axe"] };
    required.push("weapon");
  } else if (id === 58) {
    props.item = { enum: ["sword", "spear", "axe", "armory", "hospital"] };
  } else if (id === 106 || id === 107) {
    props.comparator = { enum: ["eq", "neq", "gt", "gte", "lt", "lte"] };
    props.value = { anyOf: [{ type: "integer", minimum: 0, maximum: 10 }, { $ref: "#/$defs/countExpression" }] };
    required.push("comparator", "value");
  }
  return {
    title: `${block.nameEn} (ID ${id})`,
    description: `Portuguese symbol: ${block.symbol}. English alias: ${block.alias}. Category: ${block.category}.`,
    type: "object", additionalProperties: false, required, properties: props,
  };
}

const allSchemas = BLOCK_CATALOG.map(({ id }) => nodeSchema(id));
const conditionSchemas = [...conditionIds].sort((a, b) => a - b).map((id) => nodeSchema(id));
const importSchemas = BLOCK_CATALOG.map(({ id }) => nodeSchema(id, true));
const importConditionSchemas = [...conditionIds].sort((a, b) => a - b).map((id) => nodeSchema(id, true));
const countExpressionSchemas = [nodeSchema(59), nodeSchema(60)];

export const PROGRAM_JSON_SCHEMA: ProgramJsonSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "urn:darwin-vs-humanidade:schema:program:v1",
  title: "Darwin vs Humanidade Program v1",
  type: "object",
  additionalProperties: false,
  required: ["schemaVersion", "body"],
  properties: {
    schemaVersion: { const: PROGRAM_SCHEMA_VERSION, description: "Version of this program document format." },
    body: {
      description: "Instructions executed by each unit, in order.",
      type: "array", maxItems: MAX_PROGRAM_NODES, items: { $ref: "#/$defs/node" },
    },
  },
  $defs: {
    node: { oneOf: allSchemas },
    condition: { oneOf: conditionSchemas },
    countExpression: { oneOf: countExpressionSchemas },
  },
};

export const PROGRAM_IMPORT_JSON_SCHEMA: ProgramJsonSchema = {
  ...PROGRAM_JSON_SCHEMA,
  $id: "urn:darwin-vs-humanidade:schema:program-import:v1",
  title: "Darwin vs Humanidade Program Import v1",
  $defs: {
    node: { oneOf: importSchemas },
    condition: { oneOf: importConditionSchemas },
    countExpression: { oneOf: [nodeSchema(59, true), nodeSchema(60, true)] },
  },
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function checkNode(node: unknown, path: string, depth: number, issues: ValidationIssue[], count: { value: number }, conditionOnly = false): void {
  count.value += 1;
  if (count.value > MAX_PROGRAM_NODES) {
    issues.push({ path, message: `Program exceeds ${MAX_PROGRAM_NODES} nodes.` });
    return;
  }
  if (depth > MAX_PROGRAM_DEPTH) {
    issues.push({ path, message: `Program exceeds nesting depth ${MAX_PROGRAM_DEPTH}.` });
    return;
  }
  if (!record(node)) {
    issues.push({ path, message: "Instruction must be an object." });
    return;
  }
  const op = node.op;
  if (typeof op !== "number" || !Number.isInteger(op) || !knownIds.has(op)) {
    issues.push({ path: `${path}.op`, message: "Unknown or non-numeric block ID. Resolve aliases before validation." });
    return;
  }
  if (conditionOnly && !conditionIds.has(op)) {
    issues.push({ path: `${path}.op`, message: "This block cannot be used as a condition." });
  }
  const allowed = new Set(["op"]);
  if (op === 70) {
    allowed.add("condition"); allowed.add("then"); allowed.add("else");
    checkNode(node.condition, `${path}.condition`, depth + 1, issues, count, true);
    checkList(node.then, `${path}.then`, depth + 1, issues, count);
    if (node.else !== undefined) checkList(node.else, `${path}.else`, depth + 1, issues, count);
  } else if ([71, 72].includes(op)) {
    allowed.add("body"); checkList(node.body, `${path}.body`, depth + 1, issues, count);
  } else if ([73, 74].includes(op)) {
    allowed.add("condition"); allowed.add("body");
    checkNode(node.condition, `${path}.condition`, depth + 1, issues, count, true);
    checkList(node.body, `${path}.body`, depth + 1, issues, count);
  } else if (op === 77) {
    allowed.add("seconds");
    if (typeof node.seconds !== "number" || !Number.isFinite(node.seconds) || node.seconds < 0 || node.seconds > 180 || !Number.isInteger(node.seconds * 14)) {
      issues.push({ path: `${path}.seconds`, message: "Wait seconds must be between 0 and 180 and align to 1/14 second." });
    }
  } else if (op === 31) {
    allowed.add("weapon");
    if (!weaponTypes.has(node.weapon as WeaponType)) issues.push({ path: `${path}.weapon`, message: "Expected sword, spear, or axe." });
  } else if (op >= 80 && op <= 84) {
    allowed.add("steps");
    if (node.steps !== undefined && (!Number.isInteger(node.steps) || Number(node.steps) < 1 || Number(node.steps) > 100)) {
      issues.push({ path: `${path}.steps`, message: "Steps must be an integer from 1 to 100." });
    }
  } else if (op === 68) {
    allowed.add("weapon");
    if (node.weapon !== undefined && !weaponTypes.has(node.weapon as WeaponType)) issues.push({ path: `${path}.weapon`, message: "Expected sword, spear, or axe." });
  } else if (op === 23) {
    allowed.add("weapon");
    if (!weaponTypes.has(node.weapon as WeaponType)) issues.push({ path: `${path}.weapon`, message: "Expected sword, spear, or axe." });
  } else if (op === 58) {
    allowed.add("item");
    if (node.item !== undefined && !["sword", "spear", "axe", "armory", "hospital"].includes(String(node.item))) issues.push({ path: `${path}.item`, message: "Expected a weapon or building name." });
  } else if (op === 106 || op === 107) {
    allowed.add("comparator"); allowed.add("value");
    if (!comparators.has(String(node.comparator))) issues.push({ path: `${path}.comparator`, message: "Expected eq, neq, gt, gte, lt, or lte." });
    if (record(node.value)) {
      count.value += 1;
      if (count.value > MAX_PROGRAM_NODES) issues.push({ path: `${path}.value`, message: `Program exceeds ${MAX_PROGRAM_NODES} nodes.` });
      if ((node.value.op !== 59 && node.value.op !== 60) || Object.keys(node.value).some((key) => key !== "op")) issues.push({ path: `${path}.value`, message: "Numeric expression must use block 59 or 60." });
    } else if (!Number.isInteger(node.value) || Number(node.value) < 0 || Number(node.value) > 10) issues.push({ path: `${path}.value`, message: "Comparison value must be an integer from 0 to 10 or a count expression." });
  }
  for (const key of Object.keys(node)) if (!allowed.has(key)) issues.push({ path: `${path}.${key}`, message: "Unexpected property for this block." });
}

function checkList(value: unknown, path: string, depth: number, issues: ValidationIssue[], count: { value: number }): void {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array of instructions." });
    return;
  }
  for (let index = 0; index < value.length; index += 1) checkNode(value[index], `${path}[${index}]`, depth, issues, count);
}

export function validateProgram(program: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  if (!record(program)) return { valid: false, errors: [{ path: "$", message: "Program must be an object." }] };
  if (program.schemaVersion !== PROGRAM_SCHEMA_VERSION) errors.push({ path: "$.schemaVersion", message: `Expected schemaVersion ${PROGRAM_SCHEMA_VERSION}.` });
  for (const key of Object.keys(program)) if (key !== "schemaVersion" && key !== "body") errors.push({ path: `$.${key}`, message: "Unexpected property at program root." });
  checkList(program.body, "$.body", 0, errors, { value: 0 });
  return { valid: errors.length === 0, errors };
}

export function normalizeProgramAliases(input: unknown): Program {
  if (!record(input)) throw new TypeError("Program must be a JSON object.");
  let visited = 0;
  const active = new WeakSet<object>();
  const visit = (value: unknown, depth = 0): unknown => {
    visited += 1;
    if (visited > MAX_PROGRAM_NODES * 4 + 16 || depth > MAX_PROGRAM_DEPTH * 2 + 8) throw new TypeError("Program input exceeds normalization limits.");
    if (Array.isArray(value)) {
      if (active.has(value)) throw new TypeError("Program input cannot contain cycles.");
      active.add(value);
      const result = value.map((child) => visit(child, depth + 1));
      active.delete(value);
      return result;
    }
    if (!record(value)) return value;
    if (active.has(value)) throw new TypeError("Program input cannot contain cycles.");
    active.add(value);
    const result: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === "op" && typeof child === "string") {
        const id = resolveBlockId(child);
        if (id === undefined) throw new TypeError(`Unknown block name "${child}".`);
        result[key] = id;
      } else result[key] = visit(child, depth + 1);
    }
    active.delete(value);
    return result;
  };
  return visit(input) as Program;
}

export function parseProgram(input: unknown): Program {
  const program = normalizeProgramAliases(input);
  const result = validateProgram(program);
  if (!result.valid) throw new TypeError(result.errors.map((error) => `${error.path}: ${error.message}`).join("\n"));
  return program;
}

export function createEmptyProgram(): Program {
  return { schemaVersion: PROGRAM_SCHEMA_VERSION, body: [] };
}

export type { ProgramInput } from "./types.ts";
