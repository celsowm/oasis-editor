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
  /** Which side(s) of the wrapped object text may flow on. Absent/bothSides
   * leaves both sides open; "left"/"right" restrict flow to that side. */
  wrapText?: "bothSides" | "left" | "right" | "largest";
  sourceRunId: string;
  /** Absolute-layout-coordinate tight/through contour. When present, the
   * composer carves per-line intervals from this outline instead of the rect. */
  polygon?: Array<{ x: number; y: number }>;
}

/**
 * Automatic-hyphenation configuration resolved from `EditorDocument.settings`
 * (`w:autoHyphenation` and friends). Threaded to the composer so words can break
 * at line ends with a rendered trailing hyphen.
 */
export interface HyphenationLayoutOptions {
  /** `w:autoHyphenation`: master switch. */
  enabled: boolean;
  /** `w:hyphenationZone`: min trailing gap (points) before hyphenating. */
  zone?: number;
  /** `w:consecutiveHyphenLimit`: max consecutive hyphenated lines (0/undefined = unlimited). */
  consecutiveLimit?: number;
  /** `w:doNotHyphenateCaps`: skip all-caps words. */
  doNotHyphenateCaps?: boolean;
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

export interface ITextMeasurer {
  composeMeasuredParagraphLines(
    options: TextMeasureOptions,
  ): EditorLayoutLine[];
  resolveRenderedLineHeightPx(
    styles: EditorTextStyle | undefined,
    lineHeightMultiple: number,
  ): number;
}
