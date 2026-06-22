import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { isSelectionCollapsed } from "@/core/selection.js";
import { setTextStyleValue, toggleTextStyle } from "@/core/commands/text.js";
import type { EditorSelection, EditorState } from "@/core/model.js";
import type {
  FontDialogApplyValues,
  FontDialogInitialValues,
} from "@/ui/components/Dialogs/FontDialog.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import { formatFontSizePt, parseFontSizePtToPx } from "@/ui/fontSizeUnits.js";

interface FontDialogState {
  isOpen: boolean;
  initial: FontDialogInitialValues;
}

export interface FontDialogBridgeDeps {
  toolbarStyleState: () => ToolbarStyleState;
  selection: () => EditorSelection;
  isReadOnly: () => boolean;
  loadLocalFontFamilyOptions: () => Promise<void>;
  setFontDialog: (state: FontDialogState) => void;
  setContextMenu: (state: { isOpen: boolean; x: number; y: number }) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  focusInput: () => void;
}

function createInitialValues(
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
    ligatures: (styleState.ligatures ??
      "") as FontDialogInitialValues["ligatures"],
    numberSpacing: (styleState.numberSpacing ??
      "") as FontDialogInitialValues["numberSpacing"],
    numberForm: (styleState.numberForm ??
      "") as FontDialogInitialValues["numberForm"],
    stylisticSet: styleState.stylisticSet ?? "",
    contextualAlternates: Boolean(styleState.contextualAlternates),
  };
}

export function createFontDialogBridge(deps: FontDialogBridgeDeps) {
  const openFontDialog = () => {
    void deps.loadLocalFontFamilyOptions();
    deps.setFontDialog({
      isOpen: true,
      initial: createInitialValues(deps.toolbarStyleState()),
    });
    deps.setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const applyFontDialogValues = (
    values: FontDialogApplyValues,
    original: FontDialogInitialValues,
  ) => {
    if (deps.isReadOnly()) return;
    if (isSelectionCollapsed(deps.selection())) {
      deps.focusInput();
      return;
    }

    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    deps.applyTransactionalState(
      (current) => {
        let next = current;
        if (values.fontFamily !== (original.fontFamily || null)) {
          next = setTextStyleValue(next, "fontFamily", values.fontFamily);
        }
        if (
          values.fontSize !==
          (original.fontSize ? Number(original.fontSize) : null)
        ) {
          // Dialog values are in points; the model stores pixels.
          next = setTextStyleValue(
            next,
            "fontSize",
            parseFontSizePtToPx(values.fontSize),
          );
        }
        const originalColor =
          original.colorMode === "automatic" ? null : original.color || null;
        if (values.color !== originalColor) {
          next = setTextStyleValue(next, "color", values.color);
        }
        if ((values.highlight ?? "") !== (original.highlight ?? "")) {
          next = setTextStyleValue(next, "highlight", values.highlight);
        }
        if ((values.shading ?? "") !== (original.shading ?? "")) {
          next = setTextStyleValue(next, "shading", values.shading);
        }
        if (values.bold !== Boolean(original.bold)) {
          next = toggleTextStyle(next, "bold");
        }
        if (values.italic !== Boolean(original.italic)) {
          next = toggleTextStyle(next, "italic");
        }
        const originalUnderlineStyle = original.underline
          ? (original.underlineStyle ?? "single")
          : null;
        if (
          (values.underlineStyle ?? null) !== (originalUnderlineStyle ?? null)
        ) {
          next = setTextStyleValue(
            next,
            "underlineStyle",
            values.underlineStyle,
          );
        }
        const originalUnderlineColor = original.underline
          ? original.underlineColor || null
          : null;
        if (
          (values.underlineColor ?? null) !== (originalUnderlineColor ?? null)
        ) {
          next = setTextStyleValue(
            next,
            "underlineColor",
            values.underlineColor,
          );
        }
        if (values.underline !== Boolean(original.underline)) {
          next = toggleTextStyle(next, "underline");
        }
        if (values.strike !== Boolean(original.strike)) {
          next = toggleTextStyle(next, "strike");
        }
        if (values.doubleStrike !== Boolean(original.doubleStrike)) {
          next = toggleTextStyle(next, "doubleStrike");
        }
        if (values.superscript !== Boolean(original.superscript)) {
          next = toggleTextStyle(next, "superscript");
        }
        if (values.subscript !== Boolean(original.subscript)) {
          next = toggleTextStyle(next, "subscript");
        }
        if (values.superscript && values.subscript) {
          next = toggleTextStyle(next, "subscript");
        }
        if (values.strike && values.doubleStrike) {
          next = toggleTextStyle(next, "doubleStrike");
        }
        if (values.smallCaps !== Boolean(original.smallCaps)) {
          next = toggleTextStyle(next, "smallCaps");
        }
        if (values.allCaps !== Boolean(original.allCaps)) {
          next = toggleTextStyle(next, "allCaps");
        }
        if (values.hidden !== Boolean(original.hidden)) {
          next = toggleTextStyle(next, "hidden");
        }
        const originalCharacterScale = original.characterScale
          ? Number(original.characterScale)
          : null;
        if (
          (values.characterScale ?? null) !== (originalCharacterScale ?? null)
        ) {
          next = setTextStyleValue(
            next,
            "characterScale",
            values.characterScale,
          );
        }
        const originalCharacterSpacing = original.characterSpacing
          ? Number(original.characterSpacing)
          : null;
        if (
          (values.characterSpacing ?? null) !==
          (originalCharacterSpacing ?? null)
        ) {
          next = setTextStyleValue(
            next,
            "characterSpacing",
            values.characterSpacing,
          );
        }
        const originalBaselineShift = original.baselineShift
          ? Number(original.baselineShift)
          : null;
        if (
          (values.baselineShift ?? null) !== (originalBaselineShift ?? null)
        ) {
          next = setTextStyleValue(next, "baselineShift", values.baselineShift);
        }
        const originalKerningThreshold = original.kerningThreshold
          ? Number(original.kerningThreshold)
          : null;
        if (
          (values.kerningThreshold ?? null) !==
          (originalKerningThreshold ?? null)
        ) {
          next = setTextStyleValue(
            next,
            "kerningThreshold",
            values.kerningThreshold,
          );
        }
        if ((values.ligatures ?? null) !== (original.ligatures || null)) {
          next = setTextStyleValue(next, "ligatures", values.ligatures);
        }
        if (
          (values.numberSpacing ?? null) !== (original.numberSpacing || null)
        ) {
          next = setTextStyleValue(next, "numberSpacing", values.numberSpacing);
        }
        if ((values.numberForm ?? null) !== (original.numberForm || null)) {
          next = setTextStyleValue(next, "numberForm", values.numberForm);
        }
        const originalStylisticSet = original.stylisticSet
          ? Number(original.stylisticSet)
          : null;
        if ((values.stylisticSet ?? null) !== (originalStylisticSet ?? null)) {
          next = setTextStyleValue(next, "stylisticSet", values.stylisticSet);
        }
        if (
          values.contextualAlternates !== Boolean(original.contextualAlternates)
        ) {
          next = toggleTextStyle(next, "contextualAlternates");
        }
        return next;
      },
      { mergeKey: MERGE_KEYS.fontDialog },
    );

    deps.focusInput();
  };

  return {
    openFontDialog,
    applyFontDialogValues,
  };
}
