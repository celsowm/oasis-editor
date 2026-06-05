import type {
  EditorLayoutLine,
  EditorLayoutFragment,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "./model.js";

export interface TextMeasureOptions {
  paragraph: EditorParagraphNode;
  fragments: EditorLayoutFragment[];
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
  layoutMode?: "fast" | "wordParity";
  defaultTabStop?: number;
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
