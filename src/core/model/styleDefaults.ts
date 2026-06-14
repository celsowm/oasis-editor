/**
 * System-level defaults applied last during style resolution (after named
 * styles and local overrides). These are the values the editor falls back to
 * when neither the named style chain nor the run/paragraph carry a value.
 *
 * The original `model.ts` declared `DEFAULT_TEXT_STYLE: Required<EditorTextStyle>`
 * inline and TypeScript was happy with `null` literals for the optional
 * union fields. When the same type is imported from a sibling module
 * (this folder), the `Required<...>` mapped type behaves slightly
 * differently under strict mode, so we widen the cast at the object
 * level. The runtime values are byte-identical to the original.
 */
import type { EditorTextStyle, EditorParagraphStyle } from "./types/styles.js";
import type {
  EditorUnderlineStyle,
  EditorLigatures,
  EditorNumberSpacing,
  EditorNumberForm,
  EditorTextLanguage,
  EditorBorderStyle,
  EditorTabStop,
} from "./types/primitives.js";

// Internal helper: builds a value typed as `T` by `as`-casting each nullable
// union field once at the value level. Avoids the need to sprinkle
// `as unknown as T["fieldX"]` across every literal.
function asRequired<T>(value: object): T {
  return value as T;
}

export const DEFAULT_TEXT_STYLE: Required<EditorTextStyle> = asRequired({
  styleId: undefined as unknown as string,
  bold: false,
  italic: false,
  underline: false,
  underlineStyle: null as unknown as EditorUnderlineStyle | null,
  underlineColor: null as unknown as string | null,
  strike: false,
  doubleStrike: false,
  superscript: false,
  subscript: false,
  smallCaps: false,
  allCaps: false,
  hidden: false,
  noProof: false,
  webHidden: false,
  specVanish: false,
  textEffect: null as unknown as string | null,
  characterScale: null as unknown as number | null,
  characterSpacing: null as unknown as number | null,
  baselineShift: null as unknown as number | null,
  kerningThreshold: null as unknown as number | null,
  ligatures: null as unknown as EditorLigatures | null,
  numberSpacing: null as unknown as EditorNumberSpacing | null,
  numberForm: null as unknown as EditorNumberForm | null,
  stylisticSet: null as unknown as number | null,
  contextualAlternates: false,
  fontFamily: "Calibri, sans-serif",
  fontSize: 14.6667, // 11pt
  color: "#000000",
  highlight: null as unknown as string | null,
  shading: null as unknown as string | null,
  language: null as unknown as EditorTextLanguage | null,
  link: null as unknown as string | null,
});

export const EFFECTIVE_TEXT_STYLE_DEFAULTS: Required<EditorTextStyle> =
  DEFAULT_TEXT_STYLE;

export const DEFAULT_PARAGRAPH_STYLE: Required<EditorParagraphStyle> =
  asRequired({
    styleId: undefined as unknown as string,
    align: "left",
    spacingBefore: 0,
    spacingAfter: 8,
    contextualSpacing: false,
    lineHeight: 1.15,
    lineRule: null as unknown as "auto" | "exact" | "atLeast" | null,
    lineGridPitch: null as unknown as number | null,
    lineGridType: null as unknown as
      | "lines"
      | "linesAndChars"
      | "snapToChars"
      | null,
    snapToGrid: true,
    indentLeft: 0,
    indentRight: 0,
    indentFirstLine: 0,
    indentHanging: 0,
    shading: null as unknown as string | null,
    borderTop: null as unknown as EditorBorderStyle | null,
    borderRight: null as unknown as EditorBorderStyle | null,
    borderBottom: null as unknown as EditorBorderStyle | null,
    borderLeft: null as unknown as EditorBorderStyle | null,
    tabs: null as unknown as EditorTabStop[] | null,
    pageBreakBefore: false,
    keepWithNext: false,
    keepLinesTogether: false,
    widowControl: true,
    textDirection: null as unknown as
      | "lrTb"
      | "tbRl"
      | "btLr"
      | "lrTbV"
      | "tbRlV"
      | null,
    outlineLevel: null as unknown as number | null,
  });

export const EFFECTIVE_PARAGRAPH_STYLE_DEFAULTS: Required<EditorParagraphStyle> =
  DEFAULT_PARAGRAPH_STYLE;
