/**
 * Page-number field insertion.
 *
 * WordCraft's `insert.page_number` exposes page-number fields in two shapes: a
 * bare `PAGE` field and a "Page X of Y" combination (`PAGE` + `NUMPAGES` with
 * surrounding literals). Both are inserted at the active caret inside the
 * header, footer or main body, mirroring that reference behavior.
 *
 * The field runs resolve their displayed value during layout projection; here
 * they keep the `1` placeholder Word uses for the field result.
 */
import type { EditorState, EditorTextRun } from "@/core/model.js";
import {
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { getRunField } from "@/core/model.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { cloneParagraphs } from "@/core/document/clone.js";
import {
  buildParagraphFromRuns,
  getStyleAtOffset,
  sliceRuns,
} from "@/core/document/paragraphRuns.js";
import { cloneStateWithParagraphs } from "@/core/document/blockReplacement.js";
import {
  deleteSelectionRange,
  getFocusParagraph,
  withSelection,
} from "@/core/selection/rangeEditing.js";
import { getActiveZone } from "@/core/model/editingZones.js";

export type PageNumberFieldKind = "page" | "xOfY";

/** A PAGE/NUMPAGES field run, matching `insertFieldAtSelection`'s shape. */
function fieldRun(
  type: "PAGE" | "NUMPAGES",
  styles: EditorTextRun["styles"],
  id: string,
): EditorTextRun {
  return {
    id,
    text: "1", // Placeholder, resolved during projection.
    kind: "field",
    field: { type },
    styles,
  };
}

/** True for a run that is a PAGE or NUMPAGES field. */
export function isPageNumberFieldRun(run: EditorTextRun): boolean {
  const field = getRunField(run);
  return field?.type === "PAGE" || field?.type === "NUMPAGES";
}

/** Insert a sequence of runs at the caret, replacing any current selection. */
function insertRunsAtSelection(
  state: EditorState,
  runs: EditorTextRun[],
): EditorState {
  const collapsedState = isSelectionCollapsed(state.selection)
    ? state
    : deleteSelectionRange(state);
  const { paragraph, index, offset } = getFocusParagraph(collapsedState);
  const caretStyle = getStyleAtOffset(paragraph, offset);

  const styledRuns = runs.map((run, runIndex) =>
    run.styles
      ? run
      : { ...run, styles: caretStyle, id: `${run.id}:${runIndex}` },
  );

  const nextParagraph = buildParagraphFromRuns(paragraph, [
    ...sliceRuns(paragraph, 0, offset),
    ...styledRuns,
    ...sliceRuns(paragraph, offset, getParagraphLength(paragraph)),
  ]);
  const paragraphs = getParagraphs(collapsedState);
  const nextParagraphs = [
    ...cloneParagraphs(paragraphs.slice(0, index)),
    nextParagraph,
    ...cloneParagraphs(paragraphs.slice(index + 1)),
  ];
  const insertedLength = styledRuns.reduce(
    (sum, run) => sum + run.text.length,
    0,
  );

  return cloneStateWithParagraphs(
    collapsedState,
    nextParagraphs,
    withSelection(
      paragraphOffsetToPosition(nextParagraph, offset + insertedLength),
    ),
  );
}

/**
 * Insert a page-number field at the caret in the active zone (header, footer
 * or body). `"page"` inserts a bare `PAGE` field; `"xOfY"` inserts the
 * `Page <PAGE> of <NUMPAGES>` combination Word and WordCraft use for
 * "Page X of Y" footers.
 */
export function insertPageNumberField(
  state: EditorState,
  kind: PageNumberFieldKind = "page",
): EditorState {
  const suffix = Math.random().toString(36).slice(2, 9);
  const runs: EditorTextRun[] =
    kind === "xOfY"
      ? [
          { id: `run:page-of:${suffix}`, text: "Page ", kind: "text" },
          fieldRun("PAGE", undefined, `run:page-field:${suffix}`),
          { id: `run:page-of:${suffix}`, text: " of ", kind: "text" },
          fieldRun("NUMPAGES", undefined, `run:page-field:${suffix}`),
        ]
      : [fieldRun("PAGE", undefined, `run:page-field:${suffix}`)];
  return insertRunsAtSelection(state, runs);
}

/** Exported for tests: whether the active zone is a header or footer. */
export function isInHeaderOrFooter(state: EditorState): boolean {
  const zone = getActiveZone(state);
  return zone === "header" || zone === "footer";
}
