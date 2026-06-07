import type {
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import {
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "../../core/model.js";
import { PX_PER_POINT } from "./constants.js";
import { resolveRenderedLineHeightPx } from "./fontMetrics.js";

const DEFAULT_LINE_HEIGHT = 1.15;

export function getParagraphLineHeight(
  paragraph: EditorParagraphNode,
  styles: Record<string, EditorNamedStyle> | undefined,
  fallbackFontSize: number,
): number {
  const paragraphStyle = resolveEffectiveParagraphStyle(
    paragraph.style,
    styles,
  );
  const lineHeight = paragraphStyle.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const lineGridPitch = paragraphStyle.lineGridPitch;
  const snapToGrid = paragraphStyle.snapToGrid !== false;

  const paragraphTextStyle = resolveEffectiveTextStyleForParagraph(
    undefined,
    paragraph.style?.styleId,
    styles,
  );
  const maxRunHeight = paragraph.runs.reduce((largest, run) => {
    const runTextStyle = resolveEffectiveTextStyleForParagraph(
      run.styles,
      paragraph.style?.styleId,
      styles,
    );
    const fontSize =
      runTextStyle.fontSize ?? paragraphTextStyle.fontSize ?? fallbackFontSize;
    const baselineShiftPx =
      Math.abs(runTextStyle.baselineShift ?? 0) * PX_PER_POINT;
    const runLineHeight = resolveRenderedLineHeightPx(
      { ...runTextStyle, fontSize },
      lineHeight,
    );
    const imageHeight = run.image?.height ?? 0;
    return Math.max(largest, runLineHeight + baselineShiftPx, imageHeight);
  }, 0);

  const renderedLineHeight = Math.max(
    resolveRenderedLineHeightPx(
      {
        ...paragraphTextStyle,
        fontSize: paragraphTextStyle.fontSize ?? fallbackFontSize,
      },
      lineHeight,
    ),
    maxRunHeight,
  );

  if (lineGridPitch && lineGridPitch > 0 && snapToGrid) {
    return Math.ceil(renderedLineHeight / lineGridPitch) * lineGridPitch;
  }
  return renderedLineHeight;
}
