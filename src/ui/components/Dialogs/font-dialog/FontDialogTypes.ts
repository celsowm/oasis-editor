import type {
  EditorLigatures,
  EditorNumberForm,
  EditorNumberSpacing,
  EditorUnderlineStyle,
} from "../../../../core/model.js";
import type {
  FontDialogSpacingMode,
  FontDialogPositionMode,
} from "../FontDialogModel.js";

export const DEFAULT_COLOR = "#111827";
export const DEFAULT_HIGHLIGHT = "#fef08a";
export const DEFAULT_SHADING = "#fef3c7";
export const WORD_FONT_SIZES = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
];
export const WORD_CHARACTER_SCALES = [
  33, 50, 66, 75, 90, 100, 105, 110, 115, 120, 150, 200,
];

export type FontDialogTab = "font" | "advanced";
export type FontStylePreset = "regular" | "italic" | "bold" | "boldItalic";

export type UnderlineStyleValue = EditorUnderlineStyle | "none";

export interface FontTabValues {
  familyFilter: string;
  fontFamily: string;
  fontSize: string;
  colorMode: "automatic" | "custom";
  color: string;
  highlight: string;
  shading: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  underlineStyle: UnderlineStyleValue;
  underlineColor: string;
  strike: boolean;
  doubleStrike: boolean;
  superscript: boolean;
  subscript: boolean;
  smallCaps: boolean;
  allCaps: boolean;
  hidden: boolean;
}

export interface AdvancedTabValues {
  characterScale: string;
  spacingMode: FontDialogSpacingMode;
  spacingAmount: string;
  positionMode: FontDialogPositionMode;
  positionAmount: string;
  kerningEnabled: boolean;
  kerningThreshold: string;
  ligatures: EditorLigatures | "";
  numberSpacing: EditorNumberSpacing | "";
  numberForm: EditorNumberForm | "";
  stylisticSet: string;
  contextualAlternates: boolean;
}

export interface FontDialogInitialValues {
  fontFamily: string;
  fontSize: string;
  color: string;
  colorMode: "automatic" | "custom";
  highlight: string;
  shading: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  underlineStyle: EditorUnderlineStyle | null;
  underlineColor: string;
  strike: boolean;
  doubleStrike: boolean;
  superscript: boolean;
  subscript: boolean;
  smallCaps: boolean;
  allCaps: boolean;
  hidden: boolean;
  characterScale: string;
  characterSpacing: string;
  baselineShift: string;
  kerningThreshold: string;
  ligatures: EditorLigatures | "";
  numberSpacing: EditorNumberSpacing | "";
  numberForm: EditorNumberForm | "";
  stylisticSet: string;
  contextualAlternates: boolean;
}

export interface FontDialogApplyValues {
  fontFamily: string | null;
  fontSize: number | null;
  color: string | null;
  colorMode: "automatic" | "custom";
  highlight: string | null;
  shading: string | null;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  underlineStyle: EditorUnderlineStyle | null;
  underlineColor: string | null;
  strike: boolean;
  doubleStrike: boolean;
  superscript: boolean;
  subscript: boolean;
  smallCaps: boolean;
  allCaps: boolean;
  hidden: boolean;
  characterScale: number | null;
  characterSpacing: number | null;
  baselineShift: number | null;
  kerningThreshold: number | null;
  ligatures: EditorLigatures | null;
  numberSpacing: EditorNumberSpacing | null;
  numberForm: EditorNumberForm | null;
  stylisticSet: number | null;
  contextualAlternates: boolean;
}

export interface FontDialogProps {
  isOpen: boolean;
  initial: FontDialogInitialValues;
  familyOptions: string[];
  sizeOptions: number[];
  onClose: () => void;
  onApply: (
    values: FontDialogApplyValues,
    original: FontDialogInitialValues,
  ) => void;
}
