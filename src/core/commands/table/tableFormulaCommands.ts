import type {
  EditorParagraphNode,
  EditorState,
  EditorTableCellNode,
  EditorTableNode,
} from "@/core/model.js";
import { getBlockParagraphs, paragraphOffsetToPosition } from "@/core/model.js";
import { createEditorParagraph } from "@/core/editorState.js";
import { withSelection } from "@/core/selection/rangeEditing.js";
import {
  buildTableCellLayout,
  type TableCellLayoutEntry,
} from "@/core/tableLayout.js";
import {
  getActiveTableStory,
  readInnermostTableAtPath,
  resolveActiveTableLocation,
  updateActiveTableBlocks,
} from "./tableCommandUtils.js";

/** Which cells a formula's range gathers its operands from. */
export type TableFormulaDirection = "ABOVE" | "BELOW" | "LEFT" | "RIGHT";

/** The functions this formula evaluator supports (Word's table formula set). */
export type TableFormulaFunction = "SUM" | "AVERAGE" | "COUNT" | "MIN" | "MAX";

/** The explicit, supported function scope. Anything else parses to null. */
export const SUPPORTED_TABLE_FORMULA_FUNCTIONS: readonly TableFormulaFunction[] =
  ["SUM", "AVERAGE", "COUNT", "MIN", "MAX"];

/** A parsed `=FUNCTION(DIRECTION)` formula. */
export interface ParsedTableFormula {
  function: TableFormulaFunction;
  direction: TableFormulaDirection;
}

/** True when the caret sits inside a table whose cells can be formula-targeted. */
export function canEvaluateActiveTableFormula(state: EditorState): boolean {
  return resolveActiveTableLocation(state) !== null;
}

/**
 * Parses a Word-style table formula such as `=SUM(ABOVE)`. Returns null when the
 * text is not a formula with a supported function and direction.
 */
export function parseTableFormula(raw: string): ParsedTableFormula | null {
  const match = /^\s*=\s*([A-Z]+)\s*\(\s*([A-Z]+)\s*\)\s*$/i.exec(raw);
  if (!match) return null;
  const fn = match[1]!.toUpperCase() as TableFormulaFunction;
  const direction = match[2]!.toUpperCase() as TableFormulaDirection;
  if (!SUPPORTED_TABLE_FORMULA_FUNCTIONS.includes(fn)) return null;
  if (!["ABOVE", "BELOW", "LEFT", "RIGHT"].includes(direction)) return null;
  return { function: fn, direction };
}

/**
 * Word's table "Formula": evaluate a `=FUNCTION(DIRECTION)` formula over the
 * numeric values in the cells adjacent to the active cell (per `direction`),
 * and write the result into the active cell. A no-op when the caret is outside
 * a table or the formula/range has no numeric operands.
 */
export function evaluateActiveTableFormula(
  state: EditorState,
  raw: string,
): EditorState {
  const parsed = parseTableFormula(raw);
  if (!parsed) return state;
  const target = resolveActiveTableLocation(state);
  if (!target) return state;
  const story = getActiveTableStory(state);
  if (!story) return state;
  const table = readInnermostTableAtPath(story, target.loc.tablePath);
  if (!table) return state;

  const values = collectDirectionNumbers(table, parsed.direction, target.loc);
  if (values.length === 0) return state;
  const result = applyFormula(parsed.function, values);
  const resultText = formatFormulaResult(result);

  const rowIndex = target.loc.rowIndex;
  const cellIndex = target.loc.cellIndex;
  const update = (current: EditorTableNode): EditorTableNode => ({
    ...current,
    rows: current.rows.map((row, rowIndexI): typeof row => {
      if (rowIndexI !== rowIndex) return row;
      return {
        ...row,
        cells: row.cells.map((cell, cellIndexI): EditorTableCellNode => {
          if (cellIndexI !== cellIndex) return cell;
          return { ...cell, blocks: [createEditorParagraph(resultText)] };
        }),
      };
    }),
  });

  const next = updateActiveTableBlocks(state, update);
  if (next === state) return state;
  const resultParagraph = createEditorParagraph(resultText);
  return {
    ...next,
    selection: withSelection(
      paragraphOffsetToPosition(resultParagraph, resultText.length),
    ),
  };
}

/**
 * Applies a supported table formula over `values` -> `number` result. SUM,
 * AVERAGE, MIN, MAX require at least one value; COUNT always succeeds (0 for an
 * empty set).
 */
export function applyFormula(
  fn: TableFormulaFunction,
  values: readonly number[],
): number {
  switch (fn) {
    case "SUM":
      return values.reduce((sum, value) => sum + value, 0);
    case "AVERAGE":
      return values.length > 0
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : 0;
    case "COUNT":
      return values.length;
    case "MIN":
      return values.length > 0 ? Math.min(...values) : 0;
    case "MAX":
      return values.length > 0 ? Math.max(...values) : 0;
  }
}

/** Renders a formula result as text, trimming trailing fractional zeros. */
export function formatFormulaResult(result: number): string {
  if (Number.isInteger(result) || !Number.isFinite(result)) {
    return String(result);
  }
  const rounded = Math.round(result * 1000000) / 1000000;
  return String(rounded);
}

/** Flattens a cell's paragraphs into their concatenated text. */
function cellText(cell: EditorTableCellNode | undefined): string {
  if (!cell) return "";
  return cell.blocks
    .flatMap((block): EditorParagraphNode[] =>
      block.type === "paragraph" ? [block] : getBlockParagraphs(block),
    )
    .map((paragraph) => paragraph.runs.map((run) => run.text).join(""))
    .join("\n");
}

/** Collects the leading numeric values of cells in `direction` from the active cell. */
function collectDirectionNumbers(
  table: EditorTableNode,
  direction: TableFormulaDirection,
  active: { rowIndex: number; cellIndex: number },
): number[] {
  const entries = buildTableCellLayout(table);
  const activeEntry = entries.find(
    (entry): boolean =>
      entry.rowIndex === active.rowIndex &&
      entry.cellIndex === active.cellIndex,
  );
  if (!activeEntry) return [];

  const numbers: number[] = [];
  for (const entry of entries) {
    if (
      entry.rowIndex === active.rowIndex &&
      entry.cellIndex === active.cellIndex
    ) {
      continue;
    }
    if (!axisOverlaps(activeEntry, entry, direction)) continue;
    if (!directionMatches(activeEntry, entry, direction)) continue;
    const value = leadingNumber(cellText(entry.cell));
    if (value !== null) numbers.push(value);
  }
  return numbers;
}

/** True when two cells share the grid band relevant for `direction` (rows for
 * LEFT/RIGHT, columns for ABOVE/BELOW). */
function axisOverlaps(
  a: TableCellLayoutEntry,
  b: TableCellLayoutEntry,
  direction: TableFormulaDirection,
): boolean {
  if (direction === "LEFT" || direction === "RIGHT") {
    const aRowEnd = a.visualRowIndex + a.rowSpan;
    const bRowEnd = b.visualRowIndex + b.rowSpan;
    return a.visualRowIndex < bRowEnd && b.visualRowIndex < aRowEnd;
  }
  const aColEnd = a.visualColumnIndex + a.colSpan;
  const bColEnd = b.visualColumnIndex + b.colSpan;
  return a.visualColumnIndex < bColEnd && b.visualColumnIndex < aColEnd;
}

/** Whether `other` lies in `direction` relative to `active`. */
function directionMatches(
  active: TableCellLayoutEntry,
  other: TableCellLayoutEntry,
  direction: TableFormulaDirection,
): boolean {
  switch (direction) {
    case "ABOVE":
      return other.visualRowIndex + other.rowSpan <= active.visualRowIndex;
    case "BELOW":
      return other.visualRowIndex >= active.visualRowIndex + active.rowSpan;
    case "LEFT":
      return (
        other.visualColumnIndex + other.colSpan <= active.visualColumnIndex
      );
    case "RIGHT":
      return (
        other.visualColumnIndex >= active.visualColumnIndex + active.colSpan
      );
  }
}

/** Parses a leading decimal number from text, or null when none is present. */
function leadingNumber(text: string): number | null {
  const match = /\d+(?:[.,]\d+)?/.exec(text);
  if (!match) return null;
  const normalized = match[0]!.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}
