import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import type { FontDialogInitialValues } from "@/ui/components/Dialogs/FontDialog.js";
import type { ParagraphDialogInitialValues } from "@/ui/components/Dialogs/ParagraphDialog.js";
import { formatFontSizePt } from "@/ui/fontSizeUnits.js";

/**
 * Builds the initial values for the Font dialog from the current toolbar style state.
 * Matches the logic in `useFontDialogBridge.createInitialValues`.
 */
export function createFontDialogInitialValues(
  styleState: ToolbarStyleState,
): FontDialogInitialValues {
  return {
    fontFamily: styleState.fontFamily ?? "",
    fontSize: formatFontSizePt(styleState.fontSize),
    color: styleState.color ?? "",
    colorMode: styleState.color ? "custom" : "automatic",
    highlight: styleState.highlight ?? "",
    shading: styleState.textShading ?? "",
    bold: Boolean(styleState.bold),
    italic: Boolean(styleState.italic),
    underline: Boolean(styleState.underline),
    underlineStyle: styleState.underlineStyle
      ? (styleState.underlineStyle as FontDialogInitialValues["underlineStyle"])
      : null,
    underlineColor: styleState.underlineColor ?? "",
    strike: Boolean(styleState.strike),
    doubleStrike: Boolean(styleState.doubleStrike),
    superscript: Boolean(styleState.superscript),
    subscript: Boolean(styleState.subscript),
    smallCaps: Boolean(styleState.smallCaps),
    allCaps: Boolean(styleState.allCaps),
    hidden: Boolean(styleState.hidden),
    characterScale: styleState.characterScale ?? "",
    characterSpacing: styleState.characterSpacing ?? "",
    baselineShift: styleState.baselineShift ?? "",
    kerningThreshold: styleState.kerningThreshold ?? "",
    ligatures: (styleState.ligatures ?? "") as FontDialogInitialValues["ligatures"],
    numberSpacing: (styleState.numberSpacing ??
      "") as FontDialogInitialValues["numberSpacing"],
    numberForm: (styleState.numberForm ?? "") as FontDialogInitialValues["numberForm"],
    stylisticSet: styleState.stylisticSet ?? "",
    contextualAlternates: Boolean(styleState.contextualAlternates),
  };
}

/**
 * Builds the initial values for the Paragraph dialog from the current toolbar style state.
 * Matches the logic in `useParagraphDialogBridge.createInitialValues`.
 */
export function createParagraphDialogInitialValues(
  styleState: ToolbarStyleState,
): ParagraphDialogInitialValues {
  return {
    align: styleState.align ?? "",
    indentLeft: styleState.indentLeft ?? "",
    indentRight: styleState.indentRight ?? "",
    indentFirstLine: styleState.indentFirstLine ?? "",
    indentHanging: styleState.indentHanging ?? "",
    mirrorIndents: styleState.mirrorIndents ?? false,
    spacingBefore: styleState.spacingBefore ?? "",
    spacingAfter: styleState.spacingAfter ?? "",
    lineHeight: styleState.lineHeight ?? "",
    lineRule: styleState.lineRule ?? "",
    contextualSpacing: styleState.contextualSpacing ?? false,
    outlineLevel: styleState.outlineLevel ?? "",
    shading: styleState.shading ?? "",
    borderStyle: styleState.borderStyle ?? "",
    borderWidth: styleState.borderWidth ?? "",
    borderColor: styleState.borderColor ?? "",
    borderSideTop: styleState.borderSideTop ?? false,
    borderSideRight: styleState.borderSideRight ?? false,
    borderSideBottom: styleState.borderSideBottom ?? false,
    borderSideLeft: styleState.borderSideLeft ?? false,
    pageBreakBefore: styleState.pageBreakBefore ?? false,
    keepWithNext: styleState.keepWithNext ?? false,
    keepLinesTogether: styleState.keepLinesTogether ?? false,
    widowControl: styleState.widowControl ?? true,
    tabs: styleState.tabs ?? [],
  };
}