import type {
  EditorBorderStyle,
  EditorParagraphNode,
  EditorTableCellNode,
  EditorTableNode,
  EditorTextRun,
} from "@/core/model.js";
import { PX_PER_POINT as POINT_TO_PX } from "@/core/units.js";
import type { CanvasTableBorderSpec } from "./types.js";

const DEFAULT_CELL_PADDING_TOP_BOTTOM_PX = 0;
const DEFAULT_CELL_PADDING_LEFT_RIGHT_PX = 7.2; // ~5.4pt

export function toPx(value: number): number {
  return value * POINT_TO_PX;
}

export function parseDimensionToPx(
  value: number | string | undefined,
): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return toPx(value);
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith("pt")) {
    const parsed = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(parsed) ? toPx(parsed) : null;
  }
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveDefaultBorder(): CanvasTableBorderSpec {
  return { width: 1, color: "#6f6f6f", type: "solid" };
}

export function resolveBorder(
  border: EditorBorderStyle | undefined,
): CanvasTableBorderSpec {
  if (!border) return resolveDefaultBorder();
  const width = Math.max(
    0,
    Number.isFinite(border.width) ? toPx(border.width) : 1,
  );
  return {
    width,
    color: border.color ?? "#6f6f6f",
    type: border.type ?? "solid",
  };
}

export function resolveCellPadding(cell: EditorTableCellNode): {
  top: number;
  right: number;
  bottom: number;
  left: number;
} {
  const paddingValue = cell.style?.padding;
  if (typeof paddingValue === "number" && Number.isFinite(paddingValue)) {
    const resolved = Math.max(0, toPx(paddingValue));
    return { top: resolved, right: resolved, bottom: resolved, left: resolved };
  }

  const top =
    cell.style?.paddingTop !== undefined
      ? toPx(cell.style.paddingTop)
      : DEFAULT_CELL_PADDING_TOP_BOTTOM_PX;
  const right =
    cell.style?.paddingRight !== undefined
      ? toPx(cell.style.paddingRight)
      : cell.style?.paddingEnd !== undefined
        ? toPx(cell.style.paddingEnd)
        : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;
  const bottom =
    cell.style?.paddingBottom !== undefined
      ? toPx(cell.style.paddingBottom)
      : DEFAULT_CELL_PADDING_TOP_BOTTOM_PX;
  const left =
    cell.style?.paddingLeft !== undefined
      ? toPx(cell.style.paddingLeft)
      : cell.style?.paddingStart !== undefined
        ? toPx(cell.style.paddingStart)
        : DEFAULT_CELL_PADDING_LEFT_RIGHT_PX;

  return { top, right, bottom, left };
}

export function resolveVerticalContentOffset(
  cell: EditorTableCellNode,
  contentHeightPx: number,
  contentNaturalHeightPx: number,
): number {
  const available = Math.max(0, contentHeightPx - contentNaturalHeightPx);
  if (cell.style?.verticalAlign === "bottom") {
    return available;
  }
  if (cell.style?.verticalAlign === "middle") {
    return available / 2;
  }
  return 0;
}

/**
 * Returns a paragraph clone whose inline image runs have been scaled
 * down so they never exceed `maxImageWidthPx`. Aspect ratio is preserved.
 * If no image needs shrinking, returns the original paragraph reference.
 */
export function fitImagesToCellWidth(
  paragraph: EditorParagraphNode,
  maxImageWidthPx: number,
): EditorParagraphNode {
  if (!Number.isFinite(maxImageWidthPx) || maxImageWidthPx <= 0) {
    return paragraph;
  }
  let changed = false;
  const runs: EditorTextRun[] = paragraph.runs.map((run) => {
    if (run.kind !== "image") return run;
    const { width: w, height: h } = run.image;
    if (w <= maxImageWidthPx) return run;
    const scale = maxImageWidthPx / w;
    changed = true;
    return {
      ...run,
      image: {
        ...run.image,
        width: Math.max(1, Math.floor(w * scale)),
        height: Math.max(1, Math.floor(h * scale)),
      },
    };
  });
  if (!changed) return paragraph;
  return { ...paragraph, runs };
}

/**
 * Folds a `characterScale` (percent) into every run of `paragraph`, multiplying
 * any scale a run already carries. Used to compress/expand `w:tcFitText` cell
 * text horizontally so a single line fills the cell's content width.
 */
export function applyFitTextScale(
  paragraph: EditorParagraphNode,
  scalePercent: number,
): EditorParagraphNode {
  return {
    ...paragraph,
    runs: paragraph.runs.map((run) => {
      const existing = run.styles?.characterScale;
      const combined =
        typeof existing === "number" && existing > 0
          ? (existing * scalePercent) / 100
          : scalePercent;
      return { ...run, styles: { ...run.styles, characterScale: combined } };
    }),
  };
}

export function resolveCanvasTableWidth(
  table: EditorTableNode,
  contentWidth: number,
): number {
  const raw = table.style?.width;
  if (typeof raw === "number") return Math.max(24, toPx(raw));
  if (typeof raw === "string" && raw.trim().endsWith("%")) {
    const value = Number.parseFloat(raw.trim().slice(0, -1));
    if (Number.isFinite(value))
      return Math.max(24, contentWidth * (value / 100));
  }
  return contentWidth;
}

export function resolveTableIndentLeft(table: EditorTableNode): number {
  const raw = table.style?.indentLeft;
  return typeof raw === "number" && Number.isFinite(raw) ? toPx(raw) : 0;
}

/**
 * `w:tblCellSpacing` resolved to pixels.
 */
export function resolveTableCellSpacingPx(table: EditorTableNode): number {
  const px = parseDimensionToPx(table.style?.cellSpacing);
  return px !== null && px > 0 ? px : 0;
}

/**
 * Horizontal offset of the table's left edge from the content origin, honoring
 * `w:jc` (`table.style.align`).
 */
export function resolveTableLeftOffset(
  table: EditorTableNode,
  tableWidth: number,
  contentWidth: number,
): number {
  const align = table.style?.align;
  if (align === "center" || align === "right") {
    const slack = Math.max(0, contentWidth - tableWidth);
    return align === "center" ? slack / 2 : slack;
  }
  return resolveTableIndentLeft(table);
}
