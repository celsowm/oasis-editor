/**
 * Page setup (paper size) authoring commands.
 *
 * Word sizes a section's page with `w:pgSz` (width/height in twips). The editor
 * models this as `EditorPageSettings.width/height` **in CSS pixels** at 96 DPI
 * (the default letter page is 816×1056 px, i.e. 8.5"×11"); the DOCX exporter
 * converts px → twips and the PDF layout treats the value as points after the
 * 96→72 DPI scaling. This module exposes the active section's paper size as a
 * first-class authoring command plus common named presets, so the Layout ribbon
 * can drive paper size per section (including custom dimensions) without
 * touching the rest of page setup.
 */
import type { EditorDocument, EditorState } from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import { getActiveSectionIndex } from "@/core/model/editingZones.js";
import { updateSectionSettings } from "./block.js";

/** Convert a physical dimension in points to the editor's px unit (×96/72). */
export function pointsToPx(points: number): number {
  return (points / 72) * 96;
}

/** A named paper size in points (the author-facing physical dimension). */
export interface PaperSizePreset {
  /** Machine id, e.g. "letter" / "a4". */
  id: string;
  /** Portrait dimensions in points. */
  widthPt: number;
  heightPt: number;
}

/** Common Word/WordCraft paper sizes (points). */
export const PAPER_SIZE_PRESETS: readonly PaperSizePreset[] = [
  { id: "letter", widthPt: 612, heightPt: 792 },
  { id: "legal", widthPt: 612, heightPt: 1008 },
  { id: "a4", widthPt: 595.3, heightPt: 841.9 },
  { id: "a5", widthPt: 419.5, heightPt: 595.3 },
  { id: "executive", widthPt: 522, heightPt: 756 },
  { id: "tabloid", widthPt: 792, heightPt: 1224 },
];

/** Resolve the active section index (index-clamped), matching other commands. */
function resolveActiveSectionIndex(state: EditorState): number {
  const sections = getDocumentSections(state.document);
  if (sections.length === 0) return -1;
  return Math.max(
    0,
    Math.min(getActiveSectionIndex(state), sections.length - 1),
  );
}

/**
 * Set the active section's paper dimensions from physical points. Orientation
 * is left untouched so switching a named preset never silently flips layout.
 * Returns the same state when there's no section.
 */
export function setSectionPaperSize(
  state: EditorState,
  dimensions: { widthPt: number; heightPt: number },
): EditorState {
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return state;
  return updateSectionSettings(state, sectionIndex, {
    pageSettings: {
      width: pointsToPx(dimensions.widthPt),
      height: pointsToPx(dimensions.heightPt),
    },
  });
}

/** Look up a named preset by id, or undefined. */
export function getPaperSizePreset(id: string): PaperSizePreset | undefined {
  return PAPER_SIZE_PRESETS.find((preset) => preset.id === id);
}

/** Apply a named paper-size preset to the active section. */
export function setSectionPaperSizePreset(
  state: EditorState,
  presetId: string,
): EditorState {
  const preset = getPaperSizePreset(presetId);
  if (!preset) return state;
  return setSectionPaperSize(state, {
    widthPt: preset.widthPt,
    heightPt: preset.heightPt,
  });
}

/** Read the active section's paper dimensions in physical points. */
export function getActivePaperSize(
  state: EditorState,
): { widthPt: number; heightPt: number } | undefined {
  const document: EditorDocument = state.document;
  const sections = getDocumentSections(document);
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return undefined;
  const settings = sections[sectionIndex].pageSettings;
  if (!settings) return undefined;
  // px → points: reverse the ×(96/72) scaling.
  return {
    widthPt: (settings.width / 96) * 72,
    heightPt: (settings.height / 96) * 72,
  };
}
