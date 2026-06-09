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
