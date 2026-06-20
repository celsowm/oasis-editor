import type {
  EditorBlockNode,
  EditorParagraphNode,
  EditorParagraphStyle,
  EditorSection,
  EditorState,
  EditorTextRun,
} from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getBlockParagraphs,
  getDocumentParagraphs,
  getDocumentSections,
  getParagraphText,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import {
  PT_PER_PX as PX_TO_PT,
  TWIPS_PER_INCH,
  PX_PER_INCH,
} from "@/core/units.js";
import { getHeadingLevel } from "@/core/headings.js";
import { createEditorParagraph, createEditorRun } from "@/core/editorState.js";
import { clampPosition } from "@/core/selection.js";
import { withSelection } from "@/core/selection/rangeEditing.js";

/** Default TOC scope: outline levels 1–3, matching Word's `TOC \o "1-3"`. */
export const DEFAULT_TOC_MAX_LEVEL = 3;

/** Field instruction emitted for a generated table of contents. */
const TOC_INSTRUCTION = ' TOC \\o "1-3" \\h \\z \\u ';

const twipsToPx = (twips: number): number =>
  Math.round((twips / TWIPS_PER_INCH) * PX_PER_INCH);

/** A heading captured for a TOC entry. */
export interface TocHeading {
  id: string;
  level: number;
  text: string;
}

/** Page number resolver: heading paragraph id → printed page number. */
export type TocPageNumberResolver = (headingId: string) => number | undefined;

/**
 * Collect heading paragraphs (levels 1..maxLevel) in document order. Headings
 * are detected case-insensitively via {@link getHeadingLevel}, so both the
 * editor's own `heading1` and Word's imported `Heading1` styles qualify.
 */
export function collectTocHeadings(
  state: EditorState,
  maxLevel = DEFAULT_TOC_MAX_LEVEL,
): TocHeading[] {
  const headings: TocHeading[] = [];
  for (const paragraph of getDocumentParagraphs(state.document)) {
    const level = getHeadingLevel(paragraph.style?.styleId);
    if (level === null || level > maxLevel) continue;
    const text = getParagraphText(paragraph).trim();
    if (!text) continue;
    headings.push({ id: paragraph.id, level, text });
  }
  return headings;
}

function makeRun(partial: Partial<EditorTextRun>): EditorTextRun {
  const run = createEditorRun(partial.text ?? "");
  return { ...run, ...partial, id: run.id };
}

function makeParagraph(
  runs: EditorTextRun[],
  style?: EditorParagraphStyle,
): EditorParagraphNode {
  const paragraph = createEditorParagraph("");
  paragraph.runs = runs;
  if (style) paragraph.style = style;
  return paragraph;
}

/**
 * Build the paragraph that holds an entry: "<title>\t<page>", with a right tab
 * stop (dot leader) at the content's right edge so the page number aligns to
 * the margin with a dotted leader, indented by outline level.
 *
 * Entries inherit the Normal character style (plain, no bold/color), matching
 * Word's regenerated TOC1/TOC2/TOC3 look — levels are distinguished only by the
 * left indent.
 */
function buildEntryParagraph(
  heading: TocHeading,
  pageNumber: number | undefined,
  rightTabPositionPt: number,
): EditorParagraphNode {
  const pageLabel = pageNumber !== undefined ? String(pageNumber) : "";
  const run = makeRun({ text: `${heading.text}\t${pageLabel}` });
  const style: EditorParagraphStyle = {
    tabs: [{ position: rightTabPositionPt, type: "right", leader: "dot" }],
    spacingAfter: twipsToPx(40),
    indentLeft: twipsToPx((heading.level - 1) * 397),
  };
  return makeParagraph([run], style);
}

/** Content width (in points) of a section, where the right tab stop sits. */
function rightTabPositionForSection(section: EditorSection): number {
  const { width, margins } = section.pageSettings;
  const contentWidthPx = Math.max(0, width - margins.left - margins.right);
  return Math.round(contentWidthPx * PX_TO_PT * 100) / 100;
}

/** The field-start marker paragraph: begin + instruction + separate. */
function buildStartMarkerParagraph(): EditorParagraphNode {
  return makeParagraph([
    makeRun({ text: "", fieldChar: { kind: "begin" } }),
    makeRun({ text: "", fieldInstruction: TOC_INSTRUCTION }),
    makeRun({ text: "", fieldChar: { kind: "separate" } }),
  ]);
}

/** The field-end marker paragraph. */
function buildEndMarkerParagraph(): EditorParagraphNode {
  return makeParagraph([makeRun({ text: "", fieldChar: { kind: "end" } })]);
}

/** Build the full field block sequence: start marker, entries, end marker. */
function buildTocBlocks(
  headings: TocHeading[],
  resolvePage: TocPageNumberResolver,
  rightTabPositionPt: number,
): EditorParagraphNode[] {
  const entries = headings.map((heading) =>
    buildEntryParagraph(heading, resolvePage(heading.id), rightTabPositionPt),
  );
  return [buildStartMarkerParagraph(), ...entries, buildEndMarkerParagraph()];
}

function replaceSectionBlocks(
  state: EditorState,
  sectionIndex: number,
  nextBlocks: EditorBlockNode[],
  selectionParagraph: EditorParagraphNode,
): EditorState {
  const sections = getDocumentSections(state.document);
  const section = sections[sectionIndex];
  if (!section) return state;
  const nextSections = [...sections];
  nextSections[sectionIndex] = { ...section, blocks: nextBlocks };
  return {
    ...state,
    document: { ...state.document, sections: nextSections },
    selection: withSelection(paragraphOffsetToPosition(selectionParagraph, 0)),
  };
}

/**
 * Insert a generated table of contents after the block holding the caret.
 * Operates on section blocks (not the flattened paragraph list) so it is safe
 * in documents containing tables.
 */
export function insertTableOfContents(
  state: EditorState,
  resolvePage: TocPageNumberResolver = () => undefined,
  maxLevel = DEFAULT_TOC_MAX_LEVEL,
): EditorState {
  const zone = getActiveZone(state);
  if (zone !== "main") return state;

  const sectionIndex = getActiveSectionIndex(state);
  const sections = getDocumentSections(state.document);
  const section = sections[sectionIndex];
  if (!section) return state;

  const headings = collectTocHeadings(state, maxLevel);
  const tocBlocks = buildTocBlocks(
    headings,
    resolvePage,
    rightTabPositionForSection(section),
  );

  const focus = clampPosition(state, state.selection.focus);
  const blockIndex = section.blocks.findIndex((block) => {
    if (block.id === focus.paragraphId) return true;
    if (block.type === "paragraph") return false;
    return getBlockParagraphs(block).some((p) => p.id === focus.paragraphId);
  });
  const insertAt = blockIndex === -1 ? section.blocks.length : blockIndex + 1;

  const nextBlocks = [
    ...section.blocks.slice(0, insertAt),
    ...tocBlocks,
    ...section.blocks.slice(insertAt),
  ];
  return replaceSectionBlocks(state, sectionIndex, nextBlocks, tocBlocks[0]!);
}

interface TocRegion {
  /** Index of the block holding the `separate` marker (start boundary). */
  startBlockIndex: number;
  /** Index of the block holding the `end` marker (end boundary). */
  endBlockIndex: number;
}

/** Locate the first TOC complex field in a section's top-level blocks. */
function findTocRegion(blocks: EditorBlockNode[]): TocRegion | null {
  let depth = 0;
  let instruction = "";
  let separateBlockIndex = -1;
  let beginBlockIndex = -1;
  let isToc = false;

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]!;
    if (block.type !== "paragraph") continue;
    for (const run of block.runs) {
      if (run.fieldChar?.kind === "begin") {
        depth += 1;
        if (depth === 1) {
          beginBlockIndex = i;
          instruction = "";
          isToc = false;
          separateBlockIndex = -1;
        }
      } else if (depth === 1 && run.fieldInstruction !== undefined) {
        instruction += run.fieldInstruction;
        if (/\bTOC\b/i.test(instruction)) isToc = true;
      } else if (run.fieldChar?.kind === "separate") {
        if (depth === 1) separateBlockIndex = i;
      } else if (run.fieldChar?.kind === "end") {
        if (depth === 1) {
          if (isToc) {
            return {
              startBlockIndex:
                separateBlockIndex >= 0 ? separateBlockIndex : beginBlockIndex,
              endBlockIndex: i,
            };
          }
        }
        depth = Math.max(0, depth - 1);
      }
    }
  }
  return null;
}

/**
 * Regenerate the entries of an existing TOC field from the current headings,
 * preserving the field's begin/instruction/separate and end markers. Returns
 * the unchanged state when no TOC field is present.
 */
export function updateTableOfContents(
  state: EditorState,
  resolvePage: TocPageNumberResolver = () => undefined,
  maxLevel = DEFAULT_TOC_MAX_LEVEL,
): EditorState {
  const sectionIndex = getActiveSectionIndex(state);
  const sections = getDocumentSections(state.document);
  const section = sections[sectionIndex];
  if (!section) return state;

  const region = findTocRegion(section.blocks);
  if (!region) return state;

  const headings = collectTocHeadings(state, maxLevel);
  const entries = headings.map((heading) =>
    buildEntryParagraph(
      heading,
      resolvePage(heading.id),
      rightTabPositionForSection(section),
    ),
  );

  const nextBlocks = [
    ...section.blocks.slice(0, region.startBlockIndex + 1),
    ...entries,
    ...section.blocks.slice(region.endBlockIndex),
  ];
  const selectionParagraph =
    entries[0] ??
    (section.blocks[region.startBlockIndex] as EditorParagraphNode);
  return replaceSectionBlocks(
    state,
    sectionIndex,
    nextBlocks,
    selectionParagraph,
  );
}

/** Whether a TOC field exists in the active section (for menu enablement). */
export function hasTableOfContents(state: EditorState): boolean {
  const section = getDocumentSections(state.document)[
    getActiveSectionIndex(state)
  ];
  return section ? findTocRegion(section.blocks) !== null : false;
}
