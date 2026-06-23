import type {
  EditorLayoutFragment,
  EditorNamedStyle,
  EditorParagraphNode,
  EditorTextStyle,
} from "@/core/model.js";
import type {
  FloatingExclusionRect,
  HyphenationLayoutOptions,
} from "@/core/engine.js";

export interface MeasuredChar {
  char: string;
  offset: number;
  width: number;
  /**
   * Height (px) of the inline object (image/text box) this char stands in for,
   * so the line can grow to fit it. Undefined for normal text and floating
   * objects (which are taken out of flow).
   */
  objectHeight?: number;
  /**
   * Effective text style of the run this char belongs to (shared reference).
   * Used by automatic hyphenation to measure the hyphen glyph and resolve the
   * hyphenation language; absent for inline-object placeholders.
   */
  style?: EditorTextStyle;
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
  hyphenation?: HyphenationLayoutOptions;
}
