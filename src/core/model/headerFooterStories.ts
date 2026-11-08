/**
 * Header/footer story kinds and their section story-key mapping.
 *
 * A section can carry up to six header/footer block stories: a default header &
 * footer, plus optional first-page and even/odd variants. The editing-zone model
 * (`getEditableBlocksForZone`, `getParagraphs`) and the paragraph write-back
 * (`replaceParagraphsInSection` / `cloneStateWithParagraphs`) resolve the active
 * story through these helpers, so first/even-page variants can be edited in
 * place just like the default story.
 *
 * Kept in the model layer (not `core/commands`) so the editing-zone document
 * pipeline can depend on it without a model -> commands dependency cycle.
 */
import type { EditorBlockNode } from "./types/nodes.js";
import type { EditorSection } from "./types/document.js";

export type HeaderFooterSide = "header" | "footer";
export type HeaderFooterStoryKind = "default" | "firstPage" | "evenPage";

export type HeaderFooterStoryKey =
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

/** The block story array backing a (side, kind) pair, if present. */
export function getSectionHeaderFooterBlocks(
  section: EditorSection,
  side: HeaderFooterSide,
  kind: HeaderFooterStoryKind,
): EditorBlockNode[] | undefined {
  return section[getHeaderFooterStoryKey(side, kind)];
}

/** Set the block story array for a (side, kind) pair, cloning the section. */
export function setSectionHeaderFooterBlocks(
  section: EditorSection,
  side: HeaderFooterSide,
  kind: HeaderFooterStoryKind,
  blocks: EditorBlockNode[] | undefined,
): EditorSection {
  return { ...section, [getHeaderFooterStoryKey(side, kind)]: blocks };
}
