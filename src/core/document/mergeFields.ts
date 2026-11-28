import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import {
  parseFieldInstruction,
  type FieldInstructionToken,
} from "@/ooxml/word/fieldInstruction.js";
import {
  parseFormatSwitchesFromTokens,
  type FieldFormatSwitches,
} from "@/ooxml/word/fieldFormatSwitches.js";
import {
  buildFieldStoryGraph,
  type FieldStorySpan,
} from "./fieldStoryGraph.js";
import { compareOperands, type ComparisonOperator } from "./fieldComparison.js";

export type MergeRecord = Readonly<Record<string, string>>;
export interface MergeDataSource {
  /** Caller-supplied records only: never fetched or read from a file. */
  records: readonly MergeRecord[];
}

export interface MergeFieldInstruction {
  type: "MERGEFIELD";
  name: string;
  before?: string;
  after?: string;
  mapped?: boolean;
  vertical?: boolean;
  format?: FieldFormatSwitches;
}
export type MergeOperand =
  | { kind: "literal"; value: string; quoted: boolean }
  | { kind: "mergeField"; name: string };
export interface MergeControlInstruction {
  type: "NEXT" | "NEXTIF" | "SKIPIF";
  left?: MergeOperand;
  operator?: ComparisonOperator;
  right?: MergeOperand;
}
export type MergeInstruction = MergeFieldInstruction | MergeControlInstruction;

const maxNameLength = 128;
const validName = (value: string): boolean =>
  !!value &&
  value.length <= maxNameLength &&
  /^[\p{L}_][\p{L}\p{N}_ .-]*$/u.test(value);

function operand(
  tokens: readonly FieldInstructionToken[],
  i: number,
): { value: MergeOperand; next: number } | undefined {
  const token = tokens[i];
  if (!token) return undefined;
  if (token.kind === "switch") return undefined;
  if (token.value === "MERGEFIELD") {
    const name = tokens[i + 1];
    if (!name || name.kind === "switch" || !validName(name.value))
      return undefined;
    return { value: { kind: "mergeField", name: name.value }, next: i + 2 };
  }
  if (token.value.length > 4096 || /[\r\n\t]/.test(token.value))
    return undefined;
  return {
    value: {
      kind: "literal",
      value: token.value,
      quoted: token.kind === "quoted",
    },
    next: i + 1,
  };
}

/** Strict grammar for the merge family. Unknown switches and malformed
 * conditions are preserved by the caller, never coerced into a control field. */
export function parseMergeInstruction(
  raw: string,
): MergeInstruction | undefined {
  const parsed = parseFieldInstruction(raw);
  if (parsed.error || !parsed.command) return undefined;
  const args = parsed.tokens.slice(1);
  if (parsed.command === "NEXT")
    return args.length ? undefined : { type: "NEXT" };
  if (parsed.command === "NEXTIF" || parsed.command === "SKIPIF") {
    const left = operand(args, 0);
    const op = left && args[left.next];
    if (!left || !op || op.kind !== "word") return undefined;
    const right = operand(args, left.next + 1);
    if (!right || right.next !== args.length) return undefined;
    return {
      type: parsed.command,
      left: left.value,
      operator: op.value as ComparisonOperator,
      right: right.value,
    };
  }
  if (parsed.command !== "MERGEFIELD") return undefined;
  const name = args[0];
  if (!name || name.kind === "switch" || !validName(name.value))
    return undefined;
  const format = parseFormatSwitchesFromTokens(args.slice(1), { text: true });
  if (!format) return undefined;
  const result: MergeFieldInstruction = {
    type: "MERGEFIELD",
    name: name.value,
  };
  for (let i = 0; i < format.remaining.length; i++) {
    const token = format.remaining[i]!;
    if (token.kind !== "switch") return undefined;
    const sw = token.value.toLowerCase();
    if (sw === "m") {
      if (result.mapped) return undefined;
      result.mapped = true;
      continue;
    }
    if (sw === "v") {
      if (result.vertical) return undefined;
      result.vertical = true;
      continue;
    }
    if (sw !== "b" && sw !== "f") return undefined;
    const value = format.remaining[++i];
    if (!value || value.kind !== "quoted" || value.value.length > 4096)
      return undefined;
    if (sw === "b") {
      if (result.before !== undefined) return undefined;
      result.before = value.value;
    } else {
      if (result.after !== undefined) return undefined;
      result.after = value.value;
    }
  }
  if (Object.keys(format.switches).length) result.format = format.switches;
  return result;
}

function resolveOperand(
  value: MergeOperand,
  record: MergeRecord,
): string | undefined {
  if (value.kind === "mergeField") return record[value.name];
  // A bare word is a bookmark/merge-column name; a quoted word is a literal.
  return value.quoted ? value.value : (record[value.value] ?? value.value);
}

export function resolveMergeField(
  instruction: MergeFieldInstruction,
  record: MergeRecord,
): string | undefined {
  const value = record[instruction.name];
  if (value === undefined) return undefined;
  if (!value) return "";
  return `${instruction.before ?? ""}${value}${instruction.after ?? ""}`;
}

export interface MergeControlDecision {
  /** Send the next record into the current document instead of a new one. */
  advanceInPlace: boolean;
  /** Cancel the current document and continue with the next record. */
  skipDocument: boolean;
}
export function evaluateMergeControl(
  instruction: MergeControlInstruction,
  record: MergeRecord,
): MergeControlDecision | undefined {
  if (instruction.type === "NEXT")
    return { advanceInPlace: true, skipDocument: false };
  if (!instruction.left || !instruction.right || !instruction.operator)
    return undefined;
  const left = resolveOperand(instruction.left, record);
  const right = resolveOperand(instruction.right, record);
  if (left === undefined || right === undefined) return undefined;
  const match = compareOperands(left, right, instruction.operator);
  if (match === undefined) return undefined;
  if (instruction.type === "NEXTIF")
    return { advanceInPlace: match, skipDocument: false };
  return { advanceInPlace: false, skipDocument: match };
}

interface MergeSpan {
  span: FieldStorySpan;
  paragraph: EditorParagraphNode;
  instruction: MergeInstruction;
}
/** Ordered merge fields/controls in one story. A malformed story, a nested
 * merge field or an unqualified instruction refuses the whole merge. */
export function collectMergeSpans(
  document: EditorDocument,
): MergeSpan[] | undefined {
  const result: MergeSpan[] = [];
  const seen = new Set<string>();
  for (const section of getDocumentSections(document)) {
    const paragraphs: EditorParagraphNode[] = [];
    for (const block of section.blocks as readonly EditorBlockNode[]) {
      if (block.type !== "paragraph" || seen.has(block.id)) return undefined;
      seen.add(block.id);
      paragraphs.push(block);
    }
    const graph = buildFieldStoryGraph(paragraphs);
    if (graph.diagnostics.length) return undefined;
    for (const span of graph.spans) {
      const raw = span.code
        .map((part) => (part.kind === "instruction" ? part.raw : ""))
        .join("");
      const parsed = parseFieldInstruction(raw);
      if (
        parsed.command !== "MERGEFIELD" &&
        parsed.command !== "NEXT" &&
        parsed.command !== "NEXTIF" &&
        parsed.command !== "SKIPIF"
      )
        continue;
      const instruction = parseMergeInstruction(raw);
      if (!instruction || span.parentIndex !== null) return undefined;
      result.push({
        span,
        paragraph: paragraphs[span.begin.paragraphIndex]!,
        instruction,
      });
    }
  }
  return result;
}
/** Validate story restrictions documented for NEXT/NEXTIF/SKIPIF. */
export function isMergeControlPlacementAllowed(entry: MergeSpan): boolean {
  if (entry.instruction.type === "MERGEFIELD") return true;
  if (
    entry.span.begin.paragraphIndex !== (entry.span.end?.paragraphIndex ?? -1)
  )
    return false;
  const code = entry.span.code
    .map((part) => (part.kind === "instruction" ? part.raw : ""))
    .join("");
  return !/NEXTIF|SKIPIF|\bNEXT\b/i.test(
    code.replace(/^\s*(?:NEXT|NEXTIF|SKIPIF)\b/i, ""),
  );
}

/** Replace one record's values in a cloned document. Returns the decision of
 * the first control field, or null when the record has no control. */
export function projectMergeRecord(
  document: EditorDocument,
  record: MergeRecord,
):
  | { document: EditorDocument; decision: MergeControlDecision | null }
  | undefined {
  const spans = collectMergeSpans(document);
  if (!spans || !spans.every(isMergeControlPlacementAllowed)) return undefined;
  const byParagraph = new Map<string, EditorParagraphNode>();
  const cloneParagraph = (p: EditorParagraphNode): EditorParagraphNode => {
    let next = byParagraph.get(p.id);
    if (!next) {
      next = { ...p, runs: p.runs.map((r) => ({ ...r })) };
      byParagraph.set(p.id, next);
    }
    return next;
  };
  let decision: MergeControlDecision | null = null;
  for (const { span, paragraph, instruction } of spans) {
    const p = cloneParagraph(paragraph);
    if (instruction.type === "MERGEFIELD") {
      const value = resolveMergeField(instruction, record);
      if (value === undefined) return undefined;
      for (const part of span.result) {
        if (part.kind !== "run") return undefined;
        const run = p.runs[part.point.runIndex];
        if (!run) return undefined;
        run.text = value;
      }
    } else {
      const next = evaluateMergeControl(instruction, record);
      if (!next) return undefined;
      decision ??= next;
      for (const part of span.result) {
        if (part.kind !== "run") return undefined;
        p.runs[part.point.runIndex]!.text = "";
      }
    }
  }
  const sections = getDocumentSections(document).map((section) => ({
    ...section,
    blocks: (section.blocks as readonly EditorBlockNode[]).map((block) =>
      block.type === "paragraph" ? (byParagraph.get(block.id) ?? block) : block,
    ),
  }));
  return { document: { ...document, sections }, decision };
}

function cloneBlockForRecord(
  block: EditorBlockNode,
  suffix: string,
  pageBreakBefore = false,
): EditorBlockNode {
  if (block.type !== "paragraph") return block;
  return {
    ...block,
    id: `${block.id}${suffix}`,
    ...(pageBreakBefore
      ? { style: { ...block.style, pageBreakBefore: true } }
      : {}),
    runs: block.runs.map((r) => ({ ...r, id: `${r.id}${suffix}` })),
  };
}

/** Assemble one merged document from the projected copies of every record in
 * a NEXT group: merge paragraphs are repeated in record order, all other
 * blocks are emitted once. Identities are refreshed so no two copies collide. */
function assembleGroup(
  base: EditorDocument,
  projected: readonly EditorDocument[],
  mergeIds: ReadonlySet<string>,
): EditorDocument {
  const copies = new Map<string, EditorParagraphNode[]>();
  for (const [i, doc] of projected.entries()) {
    for (const section of getDocumentSections(doc)) {
      for (const block of section.blocks) {
        if (block.type === "paragraph" && mergeIds.has(block.id)) {
          const list = copies.get(block.id) ?? [];
          list.push(
            cloneBlockForRecord(
              block,
              `:merge:${i}`,
              i > 0,
            ) as EditorParagraphNode,
          );
          copies.set(block.id, list);
        }
      }
    }
  }
  return {
    ...base,
    sections: getDocumentSections(base).map((section) => ({
      ...section,
      blocks: (section.blocks as readonly EditorBlockNode[]).flatMap((block) =>
        block.type === "paragraph" && mergeIds.has(block.id)
          ? (copies.get(block.id) ?? [block])
          : [block],
      ),
    })),
  };
}

/** Group caller-supplied records into merged documents using NEXT/NEXTIF/
 * SKIPIF. Bounded to 1000 records; no document is emitted for skipped groups. */
export function planMailMerge(
  records: readonly MergeRecord[],
  document: EditorDocument,
): EditorDocument[] | undefined {
  if (!Array.isArray(records) || records.length > 1000) return undefined;
  const spans = collectMergeSpans(document);
  if (!spans || !spans.every(isMergeControlPlacementAllowed)) return undefined;
  const mergeIds = new Set(spans.map((s) => s.paragraph.id));
  const out: EditorDocument[] = [];
  let group: EditorDocument[] = [];
  for (const record of records) {
    const projected = projectMergeRecord(document, record);
    if (!projected) return undefined;
    if (projected.decision?.skipDocument) {
      group = [];
      continue;
    }
    group.push(projected.document);
    if (!projected.decision?.advanceInPlace) {
      out.push(assembleGroup(document, group, mergeIds));
      group = [];
    }
  }
  if (group.length) out.push(assembleGroup(document, group, mergeIds));
  return out;
}
