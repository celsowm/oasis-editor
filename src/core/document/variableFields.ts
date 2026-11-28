import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorState,
} from "@/core/model.js";
import { getActiveZone, getDocumentSections } from "@/core/model.js";
import {
  parseFieldInstruction,
  type FieldInstructionToken,
} from "@/ooxml/word/fieldInstruction.js";
import { compareOperands, type ComparisonOperator } from "./fieldComparison.js";
import { evaluateFormula } from "./formulaFields.js";
import {
  formatNumericPicture,
  supportsNumericPicture,
} from "@/core/format/fieldResultFormat.js";
import { buildFieldStoryGraph } from "./fieldStoryGraph.js";

export interface SetInstruction {
  type: "SET";
  name: string;
  value: string;
}
export interface AskInstruction {
  type: "ASK";
  name: string;
  prompt: string;
  defaultValue?: string;
  once: boolean;
}
export interface FillInInstruction {
  type: "FILLIN";
  prompt: string;
  defaultValue?: string;
  once: boolean;
}
export interface CompareInstruction {
  type: "COMPARE";
  left: string;
  operator: ComparisonOperator;
  right: string;
  quoted: [boolean, boolean];
}
export interface FormulaInstruction {
  type: "FORMULA";
  expression: string;
  picture?: string;
}
export type VariableInstruction =
  | SetInstruction
  | AskInstruction
  | FillInInstruction
  | CompareInstruction
  | FormulaInstruction;

export interface VariableFieldContext {
  /** Immutable variable snapshot threaded through document order. */
  variables?: Readonly<Record<string, string>>;
  /** Explicit user/data callback. Absent means "preserve cached result". */
  prompt?: (prompt: string, defaultValue?: string) => string | undefined;
  record?: Readonly<Record<string, string>>;
}

const validName = (value: string): boolean =>
  !!value && value.length <= 128 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
const text = (
  token: FieldInstructionToken | undefined,
  max = 4096,
): string | undefined =>
  token &&
  (token.kind === "quoted" || token.kind === "word") &&
  token.value.length <= max &&
  ![...token.value].some((ch) => ch.charCodeAt(0) < 32)
    ? token.value
    : undefined;

/** Strict compiler for SET/ASK/FILLIN/COMPARE and `=`. Nested fields and
 * unknown switches stay opaque; formulas are parsed by evaluateFormula. */
export function parseVariableFieldInstruction(
  raw: string,
): VariableInstruction | undefined {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error || !parsed.command) return undefined;
  const args = parsed.tokens.slice(1);
  if (parsed.command === "SET") {
    const name = args[0],
      value = args[1];
    if (
      !name ||
      !validName(name.value) ||
      args.length !== 2 ||
      (value?.kind !== "quoted" && value?.kind !== "word")
    )
      return undefined;
    const literal = text(value);
    return literal === undefined
      ? undefined
      : { type: "SET", name: name.value, value: literal };
  }
  if (parsed.command === "ASK" || parsed.command === "FILLIN") {
    const isAsk = parsed.command === "ASK";
    const head = args[0];
    const prompt = isAsk ? text(args[1]) : head === undefined ? "" : text(head);
    if (prompt === undefined) return undefined;
    let name: string | undefined,
      defaultValue: string | undefined,
      once = false;
    let i = isAsk ? 2 : 1;
    if (isAsk) {
      if (!head || !validName(head.value)) return undefined;
      name = head.value;
    }
    const seen = new Set<string>();
    for (; i < args.length; i++) {
      const token = args[i]!;
      if (token.kind !== "switch") return undefined;
      const sw = token.value.toLowerCase();
      if (seen.has(sw)) return undefined;
      seen.add(sw);
      if (sw === "o") {
        if (once) return undefined;
        once = true;
        continue;
      }
      if (sw !== "d") return undefined;
      const value = args[++i];
      const literal = value?.kind === "quoted" ? text(value) : undefined;
      if (literal === undefined || defaultValue !== undefined) return undefined;
      defaultValue = literal;
    }
    return isAsk
      ? {
          type: "ASK",
          name: name!,
          prompt,
          ...(defaultValue !== undefined ? { defaultValue } : {}),
          once,
        }
      : {
          type: "FILLIN",
          prompt,
          ...(defaultValue !== undefined ? { defaultValue } : {}),
          once,
        };
  }
  if (parsed.command === "COMPARE") {
    const left = args[0],
      op = args[1],
      right = args[2];
    if (
      !left ||
      !op ||
      !right ||
      args.length !== 3 ||
      op.kind !== "word" ||
      left.kind === "switch" ||
      right.kind === "switch"
    )
      return undefined;
    const leftText = text(left),
      rightText = text(right);
    if (leftText === undefined || rightText === undefined) return undefined;
    return {
      type: "COMPARE",
      left: leftText,
      right: rightText,
      operator: op.value as ComparisonOperator,
      quoted: [left.kind === "quoted", right.kind === "quoted"],
    };
  }
  if (parsed.command === "=") {
    const pictureToken = args.findIndex(
      (t) => t.kind === "switch" && t.value === "#",
    );
    const expressionTokens =
      pictureToken < 0 ? args : args.slice(0, pictureToken);
    if (
      !expressionTokens.length ||
      expressionTokens.some((t) => t.kind === "switch")
    )
      return undefined;
    const expression = expressionTokens.map((t) => t.raw).join(" ");
    if (expression.length > 4096) return undefined;
    let picture: string | undefined;
    if (pictureToken >= 0) {
      if (
        pictureToken !== args.length - 2 ||
        args[pictureToken + 1]?.kind !== "quoted"
      )
        return undefined;
      picture = text(args[pictureToken + 1], 256);
      if (!picture || !supportsNumericPicture(picture)) return undefined;
    }
    return { type: "FORMULA", expression, ...(picture ? { picture } : {}) };
  }
  return undefined;
}

export interface VariableEvaluationResult {
  text: string;
  variables: Readonly<Record<string, string>>;
  status: "resolved" | "preserved";
}
function lookup(
  name: string,
  context: VariableFieldContext,
  variables: Readonly<Record<string, string>>,
): string | undefined {
  const key = name.toLowerCase();
  return variables[key] ?? context.variables?.[key] ?? context.record?.[name];
}

/** Evaluate one instruction against an immutable variable snapshot. */
export function evaluateVariableInstruction(
  instruction: VariableInstruction,
  context: VariableFieldContext,
  variables: Readonly<Record<string, string>>,
  cachedText: string,
): VariableEvaluationResult {
  const preserved = (): VariableEvaluationResult => ({
    text: cachedText,
    variables,
    status: "preserved",
  });
  if (instruction.type === "SET") {
    const value =
      lookup(instruction.value, context, variables) ?? instruction.value;
    return {
      text: "",
      variables: { ...variables, [instruction.name.toLowerCase()]: value },
      status: "resolved",
    };
  }
  if (instruction.type === "ASK") {
    if (!context.prompt) return preserved();
    const answer = context.prompt(instruction.prompt, instruction.defaultValue);
    if (answer === undefined || answer.length > 4096 || /[\r\n\t]/.test(answer))
      return preserved();
    return {
      text: "",
      variables: { ...variables, [instruction.name.toLowerCase()]: answer },
      status: "resolved",
    };
  }
  if (instruction.type === "FILLIN") {
    if (!context.prompt) return preserved();
    const answer = context.prompt(instruction.prompt, instruction.defaultValue);
    return answer === undefined ||
      answer.length > 4096 ||
      /[\r\n\t]/.test(answer)
      ? preserved()
      : { text: answer, variables, status: "resolved" };
  }
  if (instruction.type === "COMPARE") {
    const left = instruction.quoted[0]
      ? instruction.left
      : (lookup(instruction.left, context, variables) ?? instruction.left);
    const right = instruction.quoted[1]
      ? instruction.right
      : (lookup(instruction.right, context, variables) ?? instruction.right);
    const match = compareOperands(left, right, instruction.operator);
    return match === undefined
      ? preserved()
      : { text: match ? "1" : "0", variables, status: "resolved" };
  }
  const contextVariables = {
    ...context.variables,
    ...variables,
    ...context.record,
  };
  const value = evaluateFormula(instruction.expression, {
    variables: contextVariables,
  });
  if (value === undefined) return preserved();
  const numeric = typeof value === "boolean" ? (value ? 1 : 0) : value;
  const text = instruction.picture
    ? formatNumericPicture(numeric, instruction.picture)
    : String(numeric);
  return text === undefined
    ? preserved()
    : { text, variables, status: "resolved" };
}

export interface VariableRefreshResult {
  state: EditorState;
  updated: number;
  variables: Readonly<Record<string, string>>;
}

/** Walk top-level variable fields in document order, threading their variable
 * state. Unqualified fields and locked markers are left untouched. */
export function refreshVariableFieldCaches(
  original: EditorState,
  context: VariableFieldContext = {},
): VariableRefreshResult {
  if (getActiveZone(original) !== "main" || original.trackChangesEnabled)
    return { state: original, updated: 0, variables: {} };
  let variables: Readonly<Record<string, string>> = { ...context.variables };
  let updated = 0;
  const byParagraph = new Map<string, EditorParagraphNode>();
  const sections = getDocumentSections(original.document);
  const graphSpans: Array<{
    sectionIndex: number;
    paragraph: EditorParagraphNode;
    raw: string;
    runIds: string[];
    locked: boolean;
  }> = [];
  for (const [sectionIndex, section] of sections.entries()) {
    const paragraphs: EditorParagraphNode[] = [];
    for (const block of section.blocks as readonly EditorBlockNode[]) {
      if (block.type !== "paragraph")
        return { state: original, updated: 0, variables };
      paragraphs.push(block);
    }
    const graph = buildFieldStoryGraph(paragraphs);
    if (graph.diagnostics.length)
      return { state: original, updated: 0, variables };
    for (const span of graph.spans) {
      const raw = span.code
        .map((p) => (p.kind === "instruction" ? p.raw : ""))
        .join("");
      const instruction = parseVariableFieldInstruction(raw);
      if (
        !instruction ||
        span.parentIndex !== null ||
        !span.separator ||
        !span.end ||
        span.code.some((p) => p.kind !== "instruction") ||
        span.beginMarker.fieldLock
      )
        continue;
      const paragraph = paragraphs[span.begin.paragraphIndex]!;
      graphSpans.push({
        sectionIndex,
        paragraph,
        raw,
        runIds: span.result.flatMap((p) =>
          p.kind === "run" ? [p.point.runId] : [],
        ),
        locked: !!span.beginMarker.fieldLock,
      });
    }
  }
  for (const entry of graphSpans) {
    const instruction = parseVariableFieldInstruction(entry.raw)!;
    const cached = entry.paragraph.runs
      .filter((r) => entry.runIds.includes(r.id))
      .map((r) => r.text)
      .join("");
    const result = evaluateVariableInstruction(
      instruction,
      context,
      variables,
      cached,
    );
    variables = result.variables;
    if (result.status === "preserved") continue;
    let p = byParagraph.get(entry.paragraph.id);
    if (!p) {
      p = {
        ...entry.paragraph,
        runs: entry.paragraph.runs.map((r) => ({ ...r })),
      };
      byParagraph.set(p.id, p);
    }
    for (const runId of entry.runIds) {
      const run = p.runs.find((r) => r.id === runId);
      if (run) run.text = runId === entry.runIds[0] ? result.text : "";
    }
    updated++;
  }
  const nextSections = sections.map((section) => ({
    ...section,
    blocks: (section.blocks as readonly EditorBlockNode[]).map((block) =>
      block.type === "paragraph" ? (byParagraph.get(block.id) ?? block) : block,
    ),
  }));
  return {
    state: {
      ...original,
      document: { ...original.document, sections: nextSections },
    },
    updated,
    variables,
  };
}
