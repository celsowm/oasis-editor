import type { EditorLayoutLine, EditorLayoutFragment, EditorNamedStyle, EditorParagraphNode } from "./model.js";
import type { EditorSurfaceProps } from "../ui/editorUiTypes.js";
import type { JSX } from "solid-js";

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

export interface IRenderingEngine {
  id: "dom" | "canvas";
  measurer: ITextMeasurer;
  SurfaceComponent: (props: EditorSurfaceProps) => JSX.Element;
}
