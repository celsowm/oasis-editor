/**
 * Zone block replacement helpers.
 *
 * Writing a whole block stream back into the active editing zone (main /
 * header / footer), preserving the section and the header/footer story that
 * is currently being edited. This is the block-level counterpart to the
 * paragraph-level `cloneStateWithParagraphs` in `blockReplacement.js`: it is
 * used by commands that reorder blocks themselves (e.g. paragraph move
 * up/down) rather than rebuilding a flat paragraph list.
 */
import type { EditorBlockNode, EditorState } from "@/core/model.js";
import {
  getActiveSectionIndex,
  getActiveZone,
  getDocumentSections,
  setSectionHeaderFooterBlocks,
} from "@/core/model.js";

/**
 * Return a copy of `state` whose active zone's block stream is `blocks`.
 * Moves within a zone keep the section index and header/footer story fixed.
 * The selection is left untouched (callers remap it as needed).
 *
 * No-op when the zone cannot be resolved (footnote blocks are not reordered
 * by the paragraph-move commands, which refuse them up front).
 */
export function withZoneBlocks(
  state: EditorState,
  blocks: EditorBlockNode[],
): EditorState {
  const zone = getActiveZone(state);
  const sections = getDocumentSections(state.document);

  if (zone === "header" || zone === "footer") {
    const sectionIndex = getActiveSectionIndex(state);
    const section = sections[sectionIndex];
    if (!section) return state;
    const story = state.activeHeaderFooterStory ?? "default";
    const updatedSection = setSectionHeaderFooterBlocks(
      section,
      zone,
      story,
      blocks,
    );
    const updatedSections = [...sections];
    updatedSections[sectionIndex] = updatedSection;
    return {
      ...state,
      document: { ...state.document, sections: updatedSections },
    };
  }

  if (zone === "main") {
    const sectionIndex = getActiveSectionIndex(state);
    const section = sections[sectionIndex];
    if (!section) return state;
    const updatedSections = [...sections];
    updatedSections[sectionIndex] = { ...section, blocks };
    return {
      ...state,
      document: { ...state.document, sections: updatedSections },
    };
  }

  // footnote (and any future non-reorderable zone) — refuse.
  return state;
}
