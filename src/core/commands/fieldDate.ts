/**
 * Date/time field insertion.
 *
 * `DATE` fields carry a `\@` picture (e.g. `"M/d/yyyy"`) that controls the
 * displayed result, which is cached in the run's `text` like WORD does. The
 * core command inserts the field at the caret (*any* zone) with the resolved
 * date as its result, so it renders immediately and round-trips through DOCX.
 */
import type {
  EditorFieldData,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import {
  sliceRuns,
  getStyleAtOffset,
  buildParagraphFromRuns,
} from "@/core/document/paragraphRuns.js";
import { cloneParagraphs } from "@/core/document/clone.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";
import { formatDate } from "@/core/format/dateFormat.js";
import { getActiveZone } from "@/core/model/editingZones.js";

export const DEFAULT_DATE_PICTURE = "M/d/yyyy";

export interface InsertDateFieldOptions {
  /** `\@` picture controlling the result. Default `M/d/yyyy`. */
  dateFormat?: string;
  /** Value to resolve, for deterministic tests. Default now. */
  value?: Date;
}

/** Insert a DATE field at the caret with a resolved, cached result. */
export function insertDateField(
  state: EditorState,
  options: InsertDateFieldOptions = {},
): EditorState {
  const dateFormat = (options.dateFormat ?? DEFAULT_DATE_PICTURE).trim();
  const value = options.value ?? new Date();
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const caretStyle = getStyleAtOffset(paragraph, offset);

  const field: EditorFieldData =
    dateFormat.length > 0 && dateFormat !== DEFAULT_DATE_PICTURE
      ? { type: "DATE", dateFormat }
      : { type: "DATE" };
  const fieldRun: EditorTextRun = {
    id: `run:date:${Math.random().toString(36).slice(2, 9)}`,
    text: formatDate(value, dateFormat),
    kind: "field",
    field,
    styles: caretStyle,
  };

  const nextParagraph = buildParagraphFromRuns(paragraph, [
    ...sliceRuns(paragraph, 0, offset),
    fieldRun,
    ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];
  const insertedLength = fieldRun.text.length;

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(nextParagraph, offset + insertedLength),
    ),
  );
}

export function isDateFieldRun(run: EditorTextRun): boolean {
  return run.kind === "field" && run.field.type === "DATE";
}

/** Whether the active zone is a header or footer (recall DATE fields in them). */
export function isInHeaderOrFooter(state: EditorState): boolean {
  const zone = getActiveZone(state);
  return zone === "header" || zone === "footer";
}
