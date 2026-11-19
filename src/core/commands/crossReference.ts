/**
 * Cross-reference field authoring commands.
 *
 * A cross-reference inserts a typed field that points at a bookmark name and
 * displays a derived value:
 *
 * - `REF <name>` displays the target bookmark's text content (the "referenced
 *   text"), which WordCraft resolves through the bookmarked range.
 * - `PAGEREF <name> \h` displays the page number on which the bookmarked
 *   target appears, resolved during layout.
 *
 * Both reuse the typed field model exposed by `EditorFieldData` (see
 * `primitives.ts`), so they share DOCX export/import with PAGE/NUMPAGES/DATE.
 * The inserted run caches a placeholder ("1") as its displayed result; layout
 * resolves PAGEREF against the page geometry, while REF resolves through the
 * live bookmark's underlying paragraph text.
 */
import type {
  EditorBookmark,
  EditorFieldData,
  EditorParagraphNode,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { createDocumentFieldContext } from "@/core/document/fieldDocumentContext.js";
import { listBookmarks } from "./bookmark.js";
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

export type CrossReferenceType = "REF" | "PAGEREF";

export interface InsertCrossReferenceOptions {
  /** Which derived value to reference. Default `REF`. */
  type?: CrossReferenceType;
  /** The target bookmark's Word name. Required; a no-op when unknown. */
  bookmark: string;
}

/** Resolve a bookmark by its Word name, or undefined. */
export function findBookmarkByName(
  state: EditorState,
  name: string,
): EditorBookmark | undefined {
  return listBookmarks(state).find((bookmark) => bookmark.name === name);
}

/** Resolve only the requested bookmark range. The shared field context
 * refuses unsupported story/field dependencies instead of concatenating
 * unrelated paragraphs or pretending missing geometry is known. */
export function resolveBookmarkReferenceText(
  state: EditorState,
  bookmark: EditorBookmark,
): string {
  const context = createDocumentFieldContext({
    ...state.document,
    bookmarks: {items:{[bookmark.id]:bookmark},order:[bookmark.id]},
  });
  return context.bookmarkText(bookmark.name) ?? "Error! Bookmark not defined.";
}

/**
 * Insert a cross-reference field at the caret (any zone). When the target
 * bookmark is missing this is a no-op (returns the same state), so a broken
 * reference is never silently authored. The field caches a "1" placeholder as
 * its displayed result, resolved by layout for PAGEREF and by bookmarked text
 * for REF refresh.
 */
export function insertCrossReference(
  state: EditorState,
  options: InsertCrossReferenceOptions,
): EditorState {
  const type = options.type ?? "REF";
  const bookmark = findBookmarkByName(state, options.bookmark);
  if (!bookmark) {
    return state;
  }
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const caretStyle = getStyleAtOffset(paragraph, offset);

  const field: EditorFieldData = { type, bookmark: options.bookmark };
  const referenceText = type === "REF" ? createDocumentFieldContext(state.document).bookmarkText(bookmark.name) : undefined;
  const fieldRun: EditorTextRun = {
    id: `run:${type.toLowerCase()}:${Math.random().toString(36).slice(2, 9)}`,
    // Keep a nonempty placeholder for empty/unresolved references until
    // transactional field updates qualify zero-length scalar runs.
    text: referenceText && !/[\r\n]/.test(referenceText) ? referenceText : "1",
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

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(nextParagraph, offset + fieldRun.text.length),
    ),
  );
}

export function isCrossReferenceFieldRun(run: EditorTextRun): boolean {
  return (
    run.kind === "field" &&
    (run.field.type === "REF" || run.field.type === "PAGEREF")
  );
}
