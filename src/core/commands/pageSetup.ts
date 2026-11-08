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
import type {
  EditorColumnsSettings,
  EditorDocument,
  EditorSectionVerticalAlign,
  EditorState,
} from "@/core/model.js";
import { getDocumentSections } from "@/core/model.js";
import { getActiveSectionIndex } from "@/core/model/editingZones.js";
import { PX_PER_CM } from "@/core/units.js";
import { updateSectionSettings } from "./block.js";

/** Convert a physical dimension in points to the editor's px unit (×96/72). */
export function pointsToPx(points: number): number {
  return (points / 72) * 96;
}

/** Default gap between columns (0.5"), matching Word's default `w:cols` space. */
export const DEFAULT_COLUMN_SPACE_PX = 48;

/** Common multi-column presets exposed to the Layout ribbon (per Word). */
export interface ColumnLayoutPreset {
  /** Machine id, e.g. "two", "three", "left", "right". */
  id: string;
  count: number;
  /** Whether the first column is wider (asymmetric preset) rather than equal. */
  asymmetric?: boolean;
}

/** Ordinary single-column and the common newspaper presets. */
export const COLUMN_LAYOUT_PRESETS: readonly ColumnLayoutPreset[] = [
  { id: "one", count: 1 },
  { id: "two", count: 2 },
  { id: "three", count: 3 },
  { id: "left", count: 2, asymmetric: true },
  { id: "right", count: 2, asymmetric: true },
];

/** Look up a column-layout preset by id, or undefined. */
export function getColumnLayoutPreset(
  id: string,
): ColumnLayoutPreset | undefined {
  return COLUMN_LAYOUT_PRESETS.find((preset) => preset.id === id);
}

/** Read the active section's columns, or undefined when single-column. */
export function getActiveColumns(
  state: EditorState,
): EditorColumnsSettings | undefined {
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return undefined;
  return getDocumentSections(state.document)[sectionIndex].pageSettings.columns;
}

/**
 * Set the active section's multi-column layout (`w:cols`). Passing `count <= 1`
 * clears any columns.x so an ordinary single-column layout is restored. A
 * `space` of `undefined` keeps existing spacing or falls back to the 0.5"
 * default. `separator` draws a vertical rule between columns. Returns the same
 * state when there's no section.
 *
 * Only equal-width columns are authored here; explicit unequal per-column
 * widths remain round-trip-only (preserved on import, still rendered by the
 * layout engine via `getPageColumnRects`).
 */
export function setSectionColumns(
  state: EditorState,
  columns: { count: number; space?: number; separator?: boolean },
): EditorState {
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return state;
  const current = getDocumentSections(state.document)[sectionIndex].pageSettings
    .columns;
  const next: EditorColumnsSettings | undefined =
    columns.count <= 1
      ? undefined
      : {
          count: columns.count,
          space: columns.space ?? current?.space ?? DEFAULT_COLUMN_SPACE_PX,
          ...(columns.separator
            ? { separator: true }
            : current?.separator
              ? { separator: true }
              : {}),
        };
  // Replacing the whole `columns` shape: set finit values while clearing when
  // single-column. Since updateSectionSettings merges pageSettings shallowly
  // per field, assign the full key (undefined clears it).
  return updateSectionSettings(state, sectionIndex, {
    pageSettings: {
      columns: next,
    },
  });
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

/** A named page-margin preset (values mirror Word's built-ins, in cm). */
export interface MarginPreset {
  /** Machine id, e.g. "normal" / "narrow" / "moderate" / "wide" / "mirrored". */
  id: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Word's built-in page-margin presets, in centimetres. The "Normal" preset is
 * localised (pt-BR uses the ABNT 2.5/2.5/3/3 cm values rather than 1 inch).
 */
export const MARGIN_PRESETS: readonly MarginPreset[] = [
  { id: "normal", top: 2.5, bottom: 2.5, left: 3, right: 3 },
  { id: "narrow", top: 1.27, bottom: 1.27, left: 1.27, right: 1.27 },
  { id: "moderate", top: 2.54, bottom: 2.54, left: 1.91, right: 1.91 },
  { id: "wide", top: 2.54, bottom: 2.54, left: 5.08, right: 5.08 },
  { id: "mirrored", top: 2.54, bottom: 2.54, left: 3.18, right: 2.54 },
];

/** Look up a named margin preset by id, or undefined. */
export function getMarginPreset(id: string): MarginPreset | undefined {
  return MARGIN_PRESETS.find((preset) => preset.id === id);
}

/**
 * Apply a named page-margin preset to the active section. The four sided
 * margins are set from the preset's centimetre values (converted to the px
 * unit the editor stores); header / footer / gutter are left untouched.
 * Returns the same state when there's no section or unknown preset id.
 */
export function setSectionMarginsPreset(
  state: EditorState,
  presetId: string,
): EditorState {
  const preset = getMarginPreset(presetId);
  if (!preset) return state;
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return state;
  const current = getDocumentSections(state.document)[sectionIndex].pageSettings
    .margins;
  return updateSectionSettings(state, sectionIndex, {
    pageSettings: {
      margins: {
        top: Math.round(preset.top * PX_PER_CM),
        bottom: Math.round(preset.bottom * PX_PER_CM),
        left: Math.round(preset.left * PX_PER_CM),
        right: Math.round(preset.right * PX_PER_CM),
        header: current?.header ?? 0,
        footer: current?.footer ?? 0,
        gutter: current?.gutter ?? 0,
      },
    },
  });
}

/** Read the active section's vertical justification (`w:vAlign`). */
export function getSectionVerticalAlign(
  state: EditorState,
): EditorSectionVerticalAlign | undefined {
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return undefined;
  return getDocumentSections(state.document)[sectionIndex].verticalAlignment;
}

/**
 * Set the active section's vertical justification of page contents
 * (`w:vAlign`: `top` | `center` | `both` | `bottom`). `top` is the Word
 * default and is stored as `undefined`; passing `null` or `"top"` clears the
 * field. Returns the same state when there's no section.
 */
export function setSectionVerticalAlign(
  state: EditorState,
  align: EditorSectionVerticalAlign | null | undefined,
): EditorState {
  const sectionIndex = resolveActiveSectionIndex(state);
  if (sectionIndex < 0) return state;
  const verticalAlignment =
    align === undefined || align === null || align === "top"
      ? undefined
      : align;
  return updateSectionSettings(state, sectionIndex, { verticalAlignment });
}
