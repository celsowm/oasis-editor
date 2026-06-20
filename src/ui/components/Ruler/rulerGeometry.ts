import type { EditorPageSettings } from "@/core/model.js";
import { PX_PER_INCH, PX_PER_CM } from "@/core/units.js";

/**
 * Horizontal ruler geometry. The editor stores page dimensions, margins and
 * paragraph indents all in CSS pixels (96 dpi), so the ruler works purely in
 * pixels too — no point/twip conversion is needed for positioning. Only the
 * tick labels convert pixels to inches/centimeters for display.
 */

export { PX_PER_INCH, PX_PER_CM };

/** Minimum content width (px) the editor guarantees; mirrors getPageContentWidth. */
export const MIN_CONTENT_WIDTH_PX = 24;

export interface RulerIndents {
  /** Left indent (padding-left), px. */
  indentLeft: number;
  /** Right indent, px. */
  indentRight: number;
  /** First-line indent (text-indent), px. Mutually exclusive with hanging. */
  indentFirstLine: number;
  /** Hanging indent, px. Mutually exclusive with first line. */
  indentHanging: number;
}

export interface RulerGeometry {
  pageWidth: number;
  /** Left edge of the white (content) zone, px from page left. */
  contentLeft: number;
  /** Right edge of the white (content) zone, px from page left. */
  contentRight: number;
  /** Gutter width folded into the left margin, px. */
  gutter: number;
  /** X of the left-indent box / hanging marker, px from page left. */
  leftIndentX: number;
  /** X of the first-line marker (top triangle), px from page left. */
  firstLineX: number;
  /** X of the right-indent marker, px from page left. */
  rightIndentX: number;
}

/** Signed offset of the first line relative to the left indent (px). */
export function resolveFirstLineOffset(indents: RulerIndents): number {
  if (indents.indentHanging > 0) {
    return -indents.indentHanging;
  }
  return indents.indentFirstLine;
}

export function computeRulerGeometry(
  pageSettings: EditorPageSettings,
  indents: RulerIndents,
): RulerGeometry {
  const pageWidth = pageSettings.width;
  const gutter = pageSettings.margins.gutter ?? 0;
  const contentLeft = pageSettings.margins.left + gutter;
  const contentRight = pageWidth - pageSettings.margins.right;
  const leftIndentX = contentLeft + indents.indentLeft;
  const firstLineX = leftIndentX + resolveFirstLineOffset(indents);
  const rightIndentX = contentRight - indents.indentRight;
  return {
    pageWidth,
    contentLeft,
    contentRight,
    gutter,
    leftIndentX,
    firstLineX,
    rightIndentX,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Left offset of the first rendered page (`.oasis-editor-paper`) within the
 * scrollable viewport's content space, i.e. independent of the current scroll
 * position. Returns `null` when no page has been rendered/measured yet.
 *
 * The page's horizontal position is owned by CSS (scroll-content gutter +
 * centering) and differs subtly between UI variants, so the ruler measures it
 * from the DOM rather than assuming a constant. This is the single place that
 * formula lives.
 */
export function measurePageLeft(viewport: HTMLElement): number | null {
  const paper = viewport.querySelector<HTMLElement>(".oasis-editor-paper");
  if (!paper) return null;
  const viewportRect = viewport.getBoundingClientRect();
  const paperRect = paper.getBoundingClientRect();
  return paperRect.left - viewportRect.left + viewport.scrollLeft;
}

export interface RulerTick {
  x: number;
  kind: "major" | "medium" | "minor";
  label?: string;
}

/**
 * Generates ruler ticks across the page width. Word shows numbered major ticks
 * at each whole unit and smaller subdivisions in between. The origin (0) is the
 * left content edge; numbers grow outward in both directions, like Word.
 */
export function computeRulerTicks(
  pageWidth: number,
  contentLeft: number,
  unit: "in" | "cm",
): RulerTick[] {
  const major = unit === "in" ? PX_PER_INCH : PX_PER_CM;
  const subdivisions = unit === "in" ? 8 : 10; // 1/8 in or 1 mm
  const step = major / subdivisions;
  const ticks: RulerTick[] = [];

  const pushSide = (direction: 1 | -1): void => {
    const maxUnits = Math.ceil(pageWidth / major) + 1;
    for (
      let i = direction === 1 ? 0 : 1;
      i <= maxUnits * subdivisions;
      i += 1
    ) {
      const x = contentLeft + direction * i * step;
      if (x < 0 || x > pageWidth) continue;
      const isMajor = i % subdivisions === 0;
      const isMedium = !isMajor && i % (subdivisions / 2) === 0;
      const unitValue = i / subdivisions;
      ticks.push({
        x,
        kind: isMajor ? "major" : isMedium ? "medium" : "minor",
        label: isMajor && unitValue !== 0 ? String(unitValue) : undefined,
      });
    }
  };

  pushSide(1);
  pushSide(-1);
  return ticks;
}
