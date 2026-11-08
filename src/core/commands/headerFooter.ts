/**
 * Header/footer story authoring commands.
 *
 * Each section can carry up to six separate block stories: a default header
 * and footer, plus optional first-page and even/odd variants. The editing
 * stack (zone index, `getParagraphs`, `cloneStateWithParagraphs`) currently
 * resolves the **default** header/footer zone only, so `editHeaderFooter`
 * enters and edits the default story; first/even variants are exposed as
 * create/clear operations (`enableHeaderFooterStory`), with in-place editing
 * of those variants tracked as a follow-up.
 *
 * Page numbers are inserted as PAGE/NUMPAGES field runs at the active caret
 * (see `insertFieldAtSelection`), which works in the header/footer or main
 * body so a page-number field can be authored anywhere the caret sits.
 */
import type { EditorSection, EditorState } from "@/core/model.js";
import {
  getBlockParagraphs,
  getDocumentSections,
  paragraphOffsetToPosition,
} from "@/core/model.js";
import { createSectionBoundaryParagraph } from "@/core/editorState.js";
import {
  getActiveSectionIndex,
  getActiveZone,
} from "@/core/model/editingZones.js";
import { createCollapsedSelection } from "@/core/selection.js";
import { insertFieldAtSelection } from "./misc.js";

export type HeaderFooterSide = "header" | "footer";
export type HeaderFooterStoryKind = "default" | "firstPage" | "evenPage";

type HeaderFooterStoryKey =
  | "header"
  | "firstPageHeader"
  | "evenPageHeader"
  | "footer"
  | "firstPageFooter"
  | "evenPageFooter";

const SECTION_STORY_KEYS: Record<
  HeaderFooterSide,
  Record<HeaderFooterStoryKind, HeaderFooterStoryKey>
> = {
  header: {
    default: "header",
    firstPage: "firstPageHeader",
    evenPage: "evenPageHeader",
  },
  footer: {
    default: "footer",
    firstPage: "firstPageFooter",
    evenPage: "evenPageFooter",
  },
};

/** Map a (side, kind) pair onto the section's story array field name. */
export function getHeaderFooterStoryKey(
  side: HeaderFooterSide,
  kind: HeaderFooterStoryKind,
): HeaderFooterStoryKey {
  return SECTION_STORY_KEYS[side][kind];
}

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
 * Enter header/footer editing: ensure the default story exists, move the caret
 * into its first paragraph and set the active zone to `header`/`footer`.
 *
 * Only the default story is editable through today's zone stack; first/even
 * variants are created via `enableHeaderFooterStory`.
 */
export function editHeaderFooter(
  state: EditorState,
  side: HeaderFooterSide,
): EditorState {
  const withStory = enableHeaderFooterStory(state, side, "default");
  const { sections, sectionIndex } = resolveActiveSection(withStory);
  const story =
    sections[sectionIndex][getHeaderFooterStoryKey(side, "default")];
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
    return { ...state, activeZone: "main" };
  }
  return {
    ...state,
    selection: createCollapsedSelection(
      paragraphOffsetToPosition(firstParagraph, 0),
    ),
    activeSectionIndex: sectionIndex,
    activeZone: "main",
  };
}

/**
 * Insert a page-number field (PAGE) at the active caret, inside the header,
 * footer or main body. Placeholder text is resolved during layout projection.
 */
export function insertPageNumber(state: EditorState): EditorState {
  return insertFieldAtSelection(state, "PAGE");
}
