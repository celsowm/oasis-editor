import type { EditorLayoutLine, EditorLayoutFragment, EditorNamedStyle, EditorParagraphNode } from "./model.js";

export interface TextMeasureOptions {
  paragraph: EditorParagraphNode;
  fragments: EditorLayoutFragment[];
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
  layoutMode?: "fast" | "wordParity";
}

export interface ITextMeasurer {
  composeMeasuredParagraphLines(options: TextMeasureOptions): EditorLayoutLine[];
  resolveRenderedLineHeightPx(styles: any, lineHeightMultiple: number): number;
}
