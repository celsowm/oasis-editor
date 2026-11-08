/**
 * Header/footer story authoring commands.
 *
 * Each section can carry up to six separate block stories: a default header
 * and footer, plus optional first-page and even/odd variants. The story kinds
 * and their mapping onto section fields live in the model layer
 * (`core/model/headerFooterStories.ts`) so the editing-zone and write-back
 * pipeline can resolve them without a model -> commands cycle.
 *
 * `editHeaderFooter` enters any one of the six stories and records the active
 * story on `state.activeHeaderFooterStory`, so first/even-page variants are
 * edited in place just like the default story. `exitHeaderFooter` clears that
 * marker as the caret returns to the main body.
 *
 * Page numbers are inserted as PAGE/NUMPAGES field runs at the active caret
 * (see `insertFieldAtSelection`), which works in the header/footer or main
 * body so a page-number field can be authored anywhere the caret sits.
 */
import type { EditorSection, EditorState } from "@/core/model.js";
import {
  getBlockParagraphs,
  getDocumentSections,
  getHeaderFooterStoryKey,
  paragraphOffsetToPosition,
  type HeaderFooterSide,
  type HeaderFooterStoryKind,
} from "@/core/model.js";
import { createSectionBoundaryParagraph } from "@/core/editorState.js";
import {
  getActiveSectionIndex,
  getActiveZone,
} from "@/core/model/editingZones.js";
import { createCollapsedSelection } from "@/core/selection.js";
import { insertFieldAtSelection } from "./misc.js";

export type { HeaderFooterSide, HeaderFooterStoryKind } from "@/core/model.js";
export { getHeaderFooterStoryKey } from "@/core/model.js";

/** Resolve the active section (index-clamped) that header/footer ops target. */
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

/** Read-modify-write the active section, returning the same state on no-op. */
function updateActiveSection(
  state: EditorState,
  updater: (section: EditorSection) => EditorSection,
): EditorState {
  const { sections, sectionIndex } = resolveActiveSection(state);
  if (sections.length === 0) return state;
  const updated = updater(sections[sectionIndex]);
  if (updated === sections[sectionIndex]) return state;
  const nextSections = [...sections];
  nextSections[sectionIndex] = updated;
  return {
    ...state,
    document: { ...state.document, sections: nextSections },
  };
}

/**
 * Ensure the active section has the requested header/footer story, seeding an
 * empty zone-styled paragraph only when the story is absent. Existing content
 * is never overwritten. Selection and editing zone are left untouched, so this
 * is the "turn on a header / different first page / even pages" primitive.
 */
export function enableHeaderFooterStory(
  state: EditorState,
  side: HeaderFooterSide,
  kind: HeaderFooterStoryKind = "default",
): EditorState {
  const key = getHeaderFooterStoryKey(side, kind);
  return updateActiveSection(state, (section) => {
    if (section[key]) return section;
    return { ...section, [key]: [createSectionBoundaryParagraph(side)] };
  });
}

/**
 * Remove a header/footer story. If the caret was editing that story, the
 * selection returns to the main body.
 */
export function clearHeaderFooterStory(
  state: EditorState,
  side: HeaderFooterSide,
  kind: HeaderFooterStoryKind = "default",
): EditorState {
  const key = getHeaderFooterStoryKey(side, kind);
  const base = updateActiveSection(state, (section) =>
    section[key] ? { ...section, [key]: undefined } : section,
  );
  if (base === state) return state;
  return getActiveZone(base) === side ? moveToBodyStart(base) : base;
}

/**
 * Enter header/footer editing: ensure the requested story exists, move the
 * caret into its first paragraph, set the active zone to `header`/`footer` and
 * record the active story so the editing-zone and write-back pipeline target
 * it. Defaults to the `default` story when no kind is given.
 */
export function editHeaderFooter(
  state: EditorState,
  side: HeaderFooterSide,
  kind: HeaderFooterStoryKind = "default",
): EditorState {
  const withStory = enableHeaderFooterStory(state, side, kind);
  const { sections, sectionIndex } = resolveActiveSection(withStory);
  const story = sections[sectionIndex][getHeaderFooterStoryKey(side, kind)];
  const firstParagraph = (story ?? [])
    .flatMap(getBlockParagraphs)
    .find(Boolean);
  if (!firstParagraph) return withStory;
  return {
    ...withStory,
    selection: createCollapsedSelection(
      paragraphOffsetToPosition(firstParagraph, 0),
    ),
    activeSectionIndex: sectionIndex,
    activeZone: side,
    activeHeaderFooterStory: kind,
  };
}

/** Return the caret to the start of the section's main body. */
export function exitHeaderFooter(state: EditorState): EditorState {
  return moveToBodyStart(state);
}

function moveToBodyStart(state: EditorState): EditorState {
  const { sections, sectionIndex } = resolveActiveSection(state);
  const firstParagraph = (sections[sectionIndex]?.blocks ?? [])
    .flatMap(getBlockParagraphs)
    .find(Boolean);
  if (!firstParagraph) {
    return {
      ...state,
      activeZone: "main",
      activeHeaderFooterStory: undefined,
    };
  }
  return {
    ...state,
    selection: createCollapsedSelection(
      paragraphOffsetToPosition(firstParagraph, 0),
    ),
    activeSectionIndex: sectionIndex,
    activeZone: "main",
    activeHeaderFooterStory: undefined,
  };
}

/**
 * Insert a page-number field (PAGE) at the active caret, inside the header,
 * footer or main body. Placeholder text is resolved during layout projection.
 */
export function insertPageNumber(state: EditorState): EditorState {
  return insertFieldAtSelection(state, "PAGE");
}
