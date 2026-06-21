/**
 * Editing zones: resolve which block stream a given zone (main / header /
 * footer / footnote) reads from, and expose the active-section / active-zone
 * accessors used everywhere in the editor state.
 *
 * The two main entry points (`getEditableBlocksForZone` and
 * `tryGetEditableBlocksForZone`) form a deliberate Liskov pair: the
 * `try*` variant surfaces invalid states as `null` so callers can
 * distinguish "empty" from "no such zone".
 */
import type { EditorBlockNode, EditorParagraphNode } from "./types/nodes.js";
import type { EditorState } from "./editorState.js";
import type { EditorEditingZone } from "./types/selection.js";
import { getDocumentSections } from "./documentSections.js";
import { getBlockParagraphs } from "./paragraphWalker.js";

export function getActiveSectionIndex(state: EditorState): number {
  return state.activeSectionIndex ?? 0;
}

export function getActiveZone(state: EditorState): EditorEditingZone {
  return state.activeZone ?? "main";
}

/**
 * Strict variant: returns `null` when the state is invalid for the zone
 * (e.g. footnote zone with no active footnote id). Use this when you
 * need to distinguish a legitimate empty blocks list from "no such
 * editing zone available right now".
 */
export function tryGetEditableBlocksForZone(
  state: EditorState,
  zone: EditorEditingZone,
): EditorBlockNode[] | null {
  if (zone === "footnote") {
    const footnoteId = state.activeFootnoteId;
    if (!footnoteId) return null;
    const footnote = state.document.footnotes?.items?.[footnoteId];
    return footnote ? footnote.blocks : null;
  }
  const sections = getDocumentSections(state.document);
  const sectionIndex = Math.max(
    0,
    Math.min(getActiveSectionIndex(state), sections.length - 1),
  );
  const section = sections[sectionIndex];
  if (!section) return null;
  if (zone === "header") return section.header ?? null;
  if (zone === "footer") return section.footer ?? null;
  return section.blocks;
}

/**
 * Always returns an array. Falls back to `[]` when the state is invalid
 * for the requested zone. This is the right default for renderers and
 * command implementations that just want a paragraph stream.
 */
export function getEditableBlocksForZone(
  state: EditorState,
  zone: EditorEditingZone,
): EditorBlockNode[] {
  if (zone === "footnote") {
    const footnoteId = state.activeFootnoteId;
    if (!footnoteId) return [];
    const footnote = state.document.footnotes?.items?.[footnoteId];
    return footnote ? footnote.blocks : [];
  }
  const sections = getDocumentSections(state.document);
  const sectionIndex = Math.max(
    0,
    Math.min(getActiveSectionIndex(state), sections.length - 1),
  );
  const section = sections[sectionIndex];
  if (!section) return [];
  if (zone === "header") return section.header ?? [];
  if (zone === "footer") return section.footer ?? [];
  return section.blocks;
}

export function getActiveSectionBlocks(state: EditorState): EditorBlockNode[] {
  return getEditableBlocksForZone(state, "main");
}

/**
 * Convenience: paragraphs (in document order) for the active editing zone.
 * Combines `getEditableBlocksForZone` with the block→paragraph flatten so
 * callers don't need to know about both helpers.
 */
export function getParagraphs(state: EditorState): EditorParagraphNode[] {
  return getEditableBlocksForZone(state, getActiveZone(state)).flatMap(
    getBlockParagraphs,
  );
}
