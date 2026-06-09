import type {
  EditorLayoutFragment,
  EditorNamedStyle,
  EditorParagraphNode,
} from "../../core/model.js";
import type { FloatingExclusionRect } from "../../core/engine.js";

export interface MeasuredChar {
  char: string;
  offset: number;
  width: number;
}

export interface MeasuredToken {
  kind: "text" | "whitespace" | "newline";
  chars: MeasuredChar[];
  width: number;
}

export interface TextMeasureOptions {
  paragraph: EditorParagraphNode;
  fragments: EditorLayoutFragment[];
  styles?: Record<string, EditorNamedStyle>;
  contentWidth?: number;
  defaultTabStop?: number;
  exclusions?: FloatingExclusionRect[];
}
