/**
 * Generic field-code editing. Works on preserved complex fields (begin /
 * instrText / separate / result / end) without evaluating or coercing them.
 * Every operation fails closed on malformed, nested or cross-paragraph spans
 * and never rewrites a cached result or a locked field's instruction.
 */
import type {
  EditorFieldChar,
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { getStyleAtOffset, sliceRuns } from "@/core/document/paragraphRuns.js";
import { cloneParagraphs, cloneRun } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";
import { parseFieldInstruction } from "@/ooxml/word/fieldInstruction.js";
import {
  buildFieldStoryGraph,
  type FieldStorySpan,
} from "@/core/document/fieldStoryGraph.js";
import { fieldInsertionProtected } from "@/core/document/fieldMutation.js";

const newId = (prefix: string): string =>
  `${prefix}:${Math.random().toString(36).slice(2, 11)}`;

function marker(
  kind: EditorFieldChar["kind"],
  styles?: EditorTextRun["styles"],
): EditorTextRun {
  return {
    id: newId("run:fld"),
    kind: "fieldChar",
    text: "",
    fieldChar: { kind },
    styles: styles ? { ...styles } : undefined,
  };
}

/** Insert an arbitrary, lexically valid field code as a complex field with an
 * empty cached result. The begin marker is marked dirty so Word updates it. */
export function insertFieldCode(state: EditorState, raw: string): EditorState {
  if (
    typeof raw !== "string" ||
    parseFieldInstruction(raw).error ||
    fieldInsertionProtected(state)
  )
    return state;
  const collapsed = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsed);
  const styles = getStyleAtOffset(paragraph, offset);
  const instruction: EditorTextRun = {
    id: newId("run:instr"),
    kind: "fieldInstruction",
    text: "",
    fieldInstruction: raw,
    styles: styles ? { ...styles } : undefined,
  };
  const begin: EditorTextRun = {
    id: newId("run:fld"),
    kind: "fieldChar",
    text: "",
    fieldChar: { kind: "begin", dirty: true },
    styles: styles ? { ...styles } : undefined,
  };
  const separate = marker("separate", styles);
  const end = marker("end", styles);
  const result: EditorTextRun = {
    id: newId("run:result"),
    kind: "text",
    text: "",
    styles: styles ? { ...styles } : undefined,
  };
  // Keep the zero-length result run: normalizeRuns in buildParagraphFromRuns
  // would drop it and leave an unseparated, unqualified field span.
  const nextParagraph: EditorParagraphNode = {
    ...paragraph,
    runs: [
      ...sliceRuns(paragraph, 0, offset),
      begin,
      instruction,
      separate,
      result,
      end,
      ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
    ],
  };
  const paragraphs = getParagraphs(collapsed);
  return cloneStateWithParagraphs(
    collapsed,
    [
      ...cloneParagraphs(paragraphs.slice(0, index)),
      nextParagraph,
      ...cloneParagraphs(paragraphs.slice(index + 1)),
    ],
    withSelection(paragraphOffsetToPosition(nextParagraph, offset)),
  );
}

function qualifiedSpan(
  state: EditorState,
  runId: string,
): FieldStorySpan | undefined {
  const paragraphs = getParagraphs(state);
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return undefined;
  return graph.spans.find(
    (span) =>
      span.parentIndex === null &&
      (span.begin.runId === runId ||
        span.code.some(
          (part) => part.kind === "instruction" && part.point.runId === runId,
        )) &&
      span.code.every((part) => part.kind === "instruction") &&
      !!span.separator &&
      !!span.end &&
      span.begin.paragraphIndex === span.end.paragraphIndex,
  );
}

function replaceRuns(
  state: EditorState,
  paragraphIndex: number,
  replacements: ReadonlyMap<string, EditorTextRun>,
): EditorState {
  const paragraphs = getParagraphs(state);
  const paragraph = paragraphs[paragraphIndex]!;
  const next: EditorParagraphNode = {
    ...paragraph,
    runs: paragraph.runs.map(
      (run) => replacements.get(run.id) ?? cloneRun(run),
    ),
  };
  return cloneStateWithParagraphs(
    state,
    [
      ...cloneParagraphs(paragraphs.slice(0, paragraphIndex)),
      next,
      ...cloneParagraphs(paragraphs.slice(paragraphIndex + 1)),
    ],
    state.selection,
  );
}

/** Replace the instruction of one qualified span. Locked fields are refused,
 * the result is untouched, and the begin marker becomes dirty for Word. */
export function editFieldCode(
  state: EditorState,
  instructionRunId: string,
  raw: string,
): EditorState {
  if (typeof raw !== "string" || parseFieldInstruction(raw).error) return state;
  const span = qualifiedSpan(state, instructionRunId);
  if (!span || span.beginMarker.fieldLock) return state;
  const instructionIds = span.code
    .filter(
      (
        part,
      ): part is Extract<(typeof span.code)[number], { kind: "instruction" }> =>
        part.kind === "instruction",
    )
    .map((part) => part.point.runId);
  if (!instructionIds.includes(instructionRunId)) return state;
  const replacements = new Map<string, EditorTextRun>();
  const paragraph = getParagraphs(state)[span.begin.paragraphIndex]!;
  instructionIds.forEach((id, i) => {
    const run = paragraph.runs.find((r) => r.id === id);
    if (!run || run.kind !== "fieldInstruction") return;
    replacements.set(id, { ...run, fieldInstruction: i === 0 ? raw : "" });
  });
  if (replacements.size !== instructionIds.length) return state;
  const beginRun = paragraph.runs.find((r) => r.id === span.begin.runId);
  if (!beginRun || beginRun.kind !== "fieldChar") return state;
  replacements.set(span.begin.runId, {
    ...beginRun,
    fieldChar: { ...beginRun.fieldChar, dirty: true },
  });
  return replaceRuns(state, span.begin.paragraphIndex, replacements);
}

/** Toggle `w:fldLock` on the begin marker of a qualified span. */
export function toggleFieldLock(
  state: EditorState,
  fieldRunId: string,
): EditorState {
  const paragraphs = getParagraphs(state);
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return state;
  const span = graph.spans.find(
    (s) =>
      s.parentIndex === null &&
      s.begin.runId === fieldRunId &&
      !!s.separator &&
      !!s.end &&
      s.begin.paragraphIndex === s.end.paragraphIndex,
  );
  if (!span) return state;
  const paragraph = paragraphs[span.begin.paragraphIndex]!;
  const begin = paragraph.runs.find((r) => r.id === span.begin.runId);
  if (!begin || begin.kind !== "fieldChar") return state;
  return replaceRuns(
    state,
    span.begin.paragraphIndex,
    new Map([
      [
        begin.id,
        {
          ...begin,
          fieldChar: {
            ...begin.fieldChar,
            fieldLock: begin.fieldChar.fieldLock ? undefined : true,
          },
        },
      ],
    ]),
  );
}

/** Move the caret to the next/previous top-level field in document order. */
export function navigateFields(
  state: EditorState,
  direction: "next" | "previous",
): EditorState {
  const paragraphs = getParagraphs(state);
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return state;
  const spans = graph.spans.filter(
    (s) => s.parentIndex === null && !!s.separator && !!s.end,
  );
  if (spans.length < 2) return state;
  const { anchor } = state.selection;
  const current = spans.findIndex(
    (span) =>
      paragraphs[span.begin.paragraphIndex]?.id === anchor.paragraphId &&
      span.begin.offset <= anchor.offset &&
      (span.end?.offset ?? 0) >= anchor.offset,
  );
  const target =
    direction === "next"
      ? spans[current < 0 ? 0 : (current + 1) % spans.length]!
      : spans[
          current < 0
            ? spans.length - 1
            : (current - 1 + spans.length) % spans.length
        ]!;
  const paragraph = paragraphs[target.begin.paragraphIndex]!;
  return {
    ...state,
    selection: withSelection(
      paragraphOffsetToPosition(paragraph, target.begin.offset),
    ),
  };
}

/** Instruction run of the top-level field containing the caret. Used by
 * UI commands that edit the field under the selection without exposing run ids. */
export function findFieldInstructionAtSelection(
  state: EditorState,
): string | undefined {
  const paragraphs = getParagraphs(state);
  const graph = buildFieldStoryGraph(paragraphs);
  if (graph.diagnostics.length) return undefined;
  const { anchor } = state.selection;
  const span = graph.spans.find(
    (candidate) =>
      candidate.parentIndex === null &&
      candidate.begin.paragraphId === anchor.paragraphId &&
      candidate.end &&
      candidate.begin.offset <= anchor.offset &&
      candidate.end.offset >= anchor.offset,
  );
  if (!span || span.code.some((part) => part.kind !== "instruction"))
    return undefined;
  const part = span.code.find(
    (
      item,
    ): item is Extract<(typeof span.code)[number], { kind: "instruction" }> =>
      item.kind === "instruction",
  );
  return part?.point.runId;
}

/** Presentation-only state toggle. Does not mutate the document. */
export function setShowFieldCodes(
  state: EditorState,
  show: boolean,
): EditorState {
  return state.showFieldCodes === show
    ? state
    : { ...state, showFieldCodes: show };
}

/** Read-only text projection for dialogs/tests: `{ CODE result }` per field. */
export function fieldCodeDisplayText(
  paragraphs: readonly EditorParagraphNode[],
): string {
  let out = "",
    inside = false;
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      if (run.kind === "fieldChar") {
        if (run.fieldChar.kind === "begin") {
          out += "{ ";
          inside = true;
        } else if (run.fieldChar.kind === "separate") out += " ";
        else if (run.fieldChar.kind === "end") {
          out += " }";
          inside = false;
        }
      } else if (run.kind === "fieldInstruction") out += run.fieldInstruction;
      else out += inside ? "" : run.text;
    }
  }
  return out;
}
