/**
 * Page-number field insertion and placement.
 *
 * WordCraft's `insert.page_number` exposes page-number fields in two shapes: a
 * bare `PAGE` field and a "Page X of Y" combination (`PAGE` + `NUMPAGES` with
 * surrounding literals). Fields can be inserted at the active caret (`current`)
 * or placed to replace the active section's default header (`top`) or footer
 * (`bottom`) story with a single aligned paragraph, mirroring WordCraft's
 * `position` handling. The field runs resolve their displayed value during
 * layout projection; here they keep the `1` placeholder Word uses for the
 * field result.
 */
import type {
  EditorParagraphNode,
  EditorSection,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import type { PageNumberFormat } from "@/core/model.js";
import type { EditorFieldData } from "@/core/model.js";
import {
  getDocumentSections,
  getParagraphLength,
  getParagraphs,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { getRunField } from "@/core/model.js";
import {
  createCollapsedSelection,
  isSelectionCollapsed,
} from "@/core/selection.js";
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
import { createEditorNodeId } from "@/core/editorState.js";
import {
  getActiveSectionIndex,
  getActiveZone,
} from "@/core/model/editingZones.js";
import { getHeaderFooterStoryKey } from "./headerFooter.js";
import { updateSectionSettings } from "./block.js";

export type PageNumberFieldKind = "page" | "xOfY";
export type PageNumberPlacement = "current" | "top" | "bottom";
export type PageNumberAlign = "left" | "center" | "right" | "justify";

/**
 * OOXML `ST_NumberFormat` page-number values the editor can author. Stored
 * verbatim on `EditorPageNumbering.format` so uncommon imports still
 * round-trip even though only these can be authored.
 */
export type SectionPageNumberFormat =
  | "decimal"
  | "upperRoman"
  | "lowerRoman"
  | "upperLetter"
  | "lowerLetter"
  | "none";

export interface PageNumberPlacementOptions {
  /** Field shape: bare PAGE or the Page X of Y combination. Default `page`. */
  kind?: PageNumberFieldKind;
  /** `\*` number format applied to the field runs. Default decimal. */
  format?: PageNumberFormat;
  /**
   * Paragraph alignment of the placed page number. Only meaningful for
   * `top`/`bottom` (the story paragraph's alignment); WordCraft defaults the
   * placement to `center`. Ignored for `current` (caret insertion).
   */
  align?: PageNumberAlign;
}

/** A PAGE/NUMPAGES field run, matching `insertFieldAtSelection`'s shape. */
function fieldRun(
  type: "PAGE" | "NUMPAGES",
  styles: EditorTextRun["styles"],
  id: string,
  format?: PageNumberFormat,
): EditorTextRun {
  const field: EditorFieldData =
    format && format !== "decimal" ? { type, format } : { type };
  return {
    id,
    text: "1", // Placeholder, resolved during projection.
    kind: "field",
    field,
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

/** Build the field runs for a page-number shape (shared by insertion/placement). */
function buildPageNumberRuns(
  kind: PageNumberFieldKind,
  format?: PageNumberFormat,
): EditorTextRun[] {
  const suffix = Math.random().toString(36).slice(2, 9);
  if (kind === "xOfY") {
    return [
      { id: `run:page-of:${suffix}`, text: "Page ", kind: "text" },
      fieldRun("PAGE", undefined, `run:page-field:${suffix}`, format),
      { id: `run:page-of:${suffix}`, text: " of ", kind: "text" },
      fieldRun("NUMPAGES", undefined, `run:page-field:${suffix}`, format),
    ];
  }
  return [fieldRun("PAGE", undefined, `run:page-field:${suffix}`, format)];
}

/**
 * Insert a page-number field at the caret in the active zone (header, footer
 * or body). `"page"` inserts a bare `PAGE` field; `"xOfY"` inserts the
 * `Page <PAGE> of <NUMPAGES>` combination Word and WordCraft use for
 * "Page X of Y" footers. `format` selects the `\*` number format applied to
 * the field runs (default decimal).
 */
export function insertPageNumberField(
  state: EditorState,
  kind: PageNumberFieldKind = "page",
  format?: PageNumberFormat,
): EditorState {
  return insertRunsAtSelection(state, buildPageNumberRuns(kind, format));
}

/** Resolve the active section (index-clamped), like the header/footer stack. */
function resolveActiveSection(state: EditorState): {
  sections: EditorSection[];
  sectionIndex: number;
} {
  const sections = getDocumentSections(state.document);
  const sectionIndex = Math.max(
    0,
    Math.min(getActiveSectionIndex(state), sections.length - 1),
  );
  return { sections, sectionIndex };
}

/**
 * Place a page number at the requested position.
 *
 * - `current` inserts the field at the active caret (header, footer or body),
 *   reusing {@link insertPageNumberField}.
 * - `top`/`bottom` replace the active section's default header/footer story
 *   with a single aligned paragraph containing the field runs, and move the
 *   caret into that story (active zone set) — mirroring WordCraft's
 *   `position` handling, which rewrites the story to a styled, aligned
 *   paragraph.
 */
export function placePageNumber(
  state: EditorState,
  position: PageNumberPlacement,
  options: PageNumberPlacementOptions = {},
): EditorState {
  const { kind = "page", format, align = "center" } = options;

  // `current` reuses caret insertion in whatever zone the caret sits.
  if (position === "current") {
    return insertPageNumberField(state, kind, format);
  }

  const side = position === "top" ? "header" : "footer";
  const key = getHeaderFooterStoryKey(side, "default");
  const { sections, sectionIndex } = resolveActiveSection(state);
  if (sections.length === 0) return state;

  const paragraph: EditorParagraphNode = {
    id: createEditorNodeId("paragraph"),
    type: "paragraph",
    runs: buildPageNumberRuns(kind, format),
    style: { styleId: side, align },
  };
  const updated = {
    ...sections[sectionIndex],
    [key]: [paragraph],
  } as EditorSection;
  const nextSections = [...sections];
  nextSections[sectionIndex] = updated;

  return {
    ...state,
    document: { ...state.document, sections: nextSections },
    selection: createCollapsedSelection(
      paragraphOffsetToPosition(paragraph, 0),
    ),
    activeSectionIndex: sectionIndex,
    activeZone: side,
  };
}

/** Exported for tests: whether the active zone is a header or footer. */
export function isInHeaderOrFooter(state: EditorState): boolean {
  const zone = getActiveZone(state);
  return zone === "header" || zone === "footer";
}

/**
 * Set page numbering on the active section (`w:pgNumType`): the starting page
 * number and/or the number format. Only explicitly provided fields update;
 * omitted fields are left unchanged. `format` uses the OOXML `ST_NumberFormat`
 * vocabulary (`decimal`, `upperRoman`, `lowerRoman`, `upperLetter`,
 * `lowerLetter`, `none`).
 */
export function setSectionPageNumbering(
  state: EditorState,
  numbering: {
    start?: number;
    format?: SectionPageNumberFormat;
  },
): EditorState {
  const { sections, sectionIndex } = resolveActiveSection(state);
  if (sections.length === 0) return state;
  const current = sections[sectionIndex].pageNumbering;
  const next = {
    ...current,
    ...(numbering.start !== undefined ? { start: numbering.start } : {}),
    ...(numbering.format !== undefined ? { format: numbering.format } : {}),
  };
  return updateSectionSettings(state, sectionIndex, { pageNumbering: next });
}
