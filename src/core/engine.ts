import type {
  EditorLayoutLine,
  EditorLayoutFragment,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "./model.js";

export interface FloatingExclusionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  wrap: "none" | "square" | "tight" | "through" | "topAndBottom";
  sourceRunId: string;
  /** Absolute-layout-coordinate tight/through contour. When present, the
   * composer carves per-line intervals from this outline instead of the rect. */
  polygon?: Array<{ x: number; y: number }>;
}

export interface TextMeasureOptions {
  paragraph: EditorParagraphNode;
  fragments: EditorLayoutFragment[];
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
  defaultTabStop?: number;
  exclusions?: FloatingExclusionRect[];
}

export interface ITextMeasurer {
  composeMeasuredParagraphLines(
    options: TextMeasureOptions,
  ): EditorLayoutLine[];
  resolveRenderedLineHeightPx(
    styles: EditorTextStyle | undefined,
    lineHeightMultiple: number,
  ): number;
}
