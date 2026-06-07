import { For, createEffect, createMemo, createSignal } from "solid-js";
import { Dialog } from "./Dialog.js";
import { Tabs } from "../Tabs/Tabs.js";
import { t } from "../../../i18n/index.js";
import type {
  EditorLigatures,
  EditorNumberForm,
  EditorNumberSpacing,
  EditorUnderlineStyle,
} from "../../../core/model.js";
import { UNDERLINE_STYLE_OPTIONS } from "../Toolbar/underlineStyles.js";
import {
  featureSettingsToCss,
  formatNullableNumber,
  ligaturesToCss,
  numericToCss,
  parseNonNegativeNumber,
  parsePositiveNumber,
  parseStylisticSet,
  resolveFontFaceStyle,
  resolvePositionMode,
  resolveSpacingMode,
  type FontDialogPositionMode,
  type FontDialogSpacingMode,
  type FontFaceStyle,
} from "./FontDialogModel.js";

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

const DEFAULT_COLOR = "#111827";
const DEFAULT_HIGHLIGHT = "#fef08a";
const DEFAULT_SHADING = "#fef3c7";
const WORD_FONT_SIZES = [
  8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 36, 48, 72,
];
const WORD_CHARACTER_SCALES = [
  33, 50, 66, 75, 90, 100, 105, 110, 115, 120, 150, 200,
];
type UnderlineStyleValue = EditorUnderlineStyle | "none";

interface FontTabValues {
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

interface AdvancedTabValues {
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

export function FontDialog(props: FontDialogProps) {
  const [activeTab, setActiveTab] = createSignal<"font" | "advanced">("font");
  const [fontTabValues, setFontTabValues] = createSignal<FontTabValues>({
    familyFilter: "",
    fontFamily: "",
    fontSize: "",
    colorMode: "custom",
    color: DEFAULT_COLOR,
    highlight: "",
    shading: "",
    bold: false,
    italic: false,
    underline: false,
    underlineStyle: "none",
    underlineColor: DEFAULT_COLOR,
    strike: false,
    doubleStrike: false,
    superscript: false,
    subscript: false,
    smallCaps: false,
    allCaps: false,
    hidden: false,
  });
  const [advancedTabValues, setAdvancedTabValues] =
    createSignal<AdvancedTabValues>({
      characterScale: "",
      spacingMode: "normal",
      spacingAmount: "",
      positionMode: "normal",
      positionAmount: "",
      kerningEnabled: false,
      kerningThreshold: "",
      ligatures: "",
      numberSpacing: "",
      numberForm: "",
      stylisticSet: "",
      contextualAlternates: false,
    });

  createEffect(() => {
    if (props.isOpen) {
      setActiveTab("font");
      setFontTabValues({
        familyFilter: "",
        fontFamily: props.initial.fontFamily ?? "",
        fontSize: props.initial.fontSize ?? "",
        colorMode: props.initial.colorMode,
        color: props.initial.color || DEFAULT_COLOR,
        highlight: props.initial.highlight || "",
        shading: props.initial.shading || "",
        bold: Boolean(props.initial.bold),
        italic: Boolean(props.initial.italic),
        underline: Boolean(props.initial.underline),
        underlineStyle: props.initial.underline
          ? (props.initial.underlineStyle ?? "single")
          : "none",
        underlineColor: props.initial.underlineColor || DEFAULT_COLOR,
        strike: Boolean(props.initial.strike),
        doubleStrike: Boolean(props.initial.doubleStrike),
        superscript: Boolean(props.initial.superscript),
        subscript: Boolean(props.initial.subscript),
        smallCaps: Boolean(props.initial.smallCaps),
        allCaps: Boolean(props.initial.allCaps),
        hidden: Boolean(props.initial.hidden),
      });
      setAdvancedTabValues({
        characterScale: formatNullableNumber(props.initial.characterScale),
        spacingMode: resolveSpacingMode(props.initial.characterSpacing),
        spacingAmount: props.initial.characterSpacing
          ? String(Math.abs(Number(props.initial.characterSpacing)))
          : "",
        positionMode: resolvePositionMode(props.initial.baselineShift),
        positionAmount: props.initial.baselineShift
          ? String(Math.abs(Number(props.initial.baselineShift)))
          : "",
        kerningEnabled: props.initial.kerningThreshold !== "",
        kerningThreshold: formatNullableNumber(props.initial.kerningThreshold),
        ligatures: props.initial.ligatures,
        numberSpacing: props.initial.numberSpacing,
        numberForm: props.initial.numberForm,
        stylisticSet: formatNullableNumber(props.initial.stylisticSet),
        contextualAlternates: Boolean(props.initial.contextualAlternates),
      });
    }
  });

  const selectedFontStyle = createMemo<FontFaceStyle>(() =>
    resolveFontFaceStyle(fontTabValues().bold, fontTabValues().italic),
  );
  const visibleFamilyOptions = createMemo(() => {
    const needle = fontTabValues().familyFilter.trim().toLowerCase();
    if (!needle) return props.familyOptions;
    return props.familyOptions.filter((family) =>
      family.toLowerCase().includes(needle),
    );
  });
  const effectiveSizeOptions = createMemo(() => {
    const set = new Set<number>(WORD_FONT_SIZES);
    for (const size of props.sizeOptions) set.add(size);
    const current = Number(fontTabValues().fontSize);
    if (Number.isFinite(current) && current > 0) set.add(current);
    return Array.from(set).sort((a, b) => a - b);
  });
  const customSizeError = createMemo(() => {
    const raw = fontTabValues().fontSize.trim();
    if (!raw) return "";
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0
      ? ""
      : t("dialog.font.sizeInvalid");
  });
  const advancedValidationError = createMemo(() => {
    const advanced = advancedTabValues();
    if (
      advanced.characterScale.trim() &&
      parsePositiveNumber(advanced.characterScale) === null
    ) {
      return t("dialog.font.advancedScaleInvalid");
    }
    if (
      advanced.spacingMode !== "normal" &&
      parseNonNegativeNumber(advanced.spacingAmount) === null
    ) {
      return t("dialog.font.advancedAmountInvalid");
    }
    if (
      advanced.positionMode !== "normal" &&
      parseNonNegativeNumber(advanced.positionAmount) === null
    ) {
      return t("dialog.font.advancedAmountInvalid");
    }
    if (
      advanced.kerningThreshold.trim() &&
      parseNonNegativeNumber(advanced.kerningThreshold) === null
    ) {
      return t("dialog.font.advancedKerningInvalid");
    }
    if (
      advanced.stylisticSet.trim() &&
      parseStylisticSet(advanced.stylisticSet) === null
    ) {
      return t("dialog.font.advancedStylisticSetInvalid");
    }
    return "";
  });
  const previewStyle = createMemo(() => {
    const fontTab = fontTabValues();
    const advancedTab = advancedTabValues();
    const size = Number(fontTab.fontSize);
    const scale = parsePositiveNumber(advancedTab.characterScale) ?? 100;
    const spacingAmount =
      advancedTab.spacingMode === "normal"
        ? null
        : parseNonNegativeNumber(advancedTab.spacingAmount);
    const positionAmount =
      advancedTab.positionMode === "normal"
        ? null
        : parseNonNegativeNumber(advancedTab.positionAmount);
    const spacing =
      spacingAmount === null
        ? undefined
        : advancedTab.spacingMode === "condensed"
          ? `-${spacingAmount}pt`
          : `${spacingAmount}pt`;
    const baselineShift =
      positionAmount === null
        ? undefined
        : advancedTab.positionMode === "lowered"
          ? `-${positionAmount}pt`
          : `${positionAmount}pt`;
    const textDecorations: string[] = [];
    if (fontTab.underline && fontTab.underlineStyle !== "none")
      textDecorations.push("underline");
    if (fontTab.strike) textDecorations.push("line-through");
    if (fontTab.doubleStrike) textDecorations.push("line-through");
    return {
      "font-family": fontTab.fontFamily || "inherit",
      "font-size": Number.isFinite(size) && size > 0 ? `${size}pt` : undefined,
      "font-weight": fontTab.bold ? 700 : 400,
      "font-style": fontTab.italic ? "italic" : "normal",
      "text-decoration": textDecorations.join(" ") || "none",
      color: fontTab.colorMode === "automatic" ? "inherit" : fontTab.color,
      "background-color": fontTab.highlight || fontTab.shading || undefined,
      "vertical-align":
        baselineShift ??
        (fontTab.superscript
          ? "super"
          : fontTab.subscript
            ? "sub"
            : "baseline"),
      "font-stretch": `${scale}%`,
      "letter-spacing": spacing,
      "font-variant-ligatures": ligaturesToCss(advancedTab.ligatures),
      "font-variant-numeric": numericToCss(
        advancedTab.numberSpacing,
        advancedTab.numberForm,
      ),
      "font-feature-settings": featureSettingsToCss(
        advancedTab.stylisticSet,
        advancedTab.contextualAlternates,
      ),
    } as Record<string, string | number | undefined>;
  });

  const applyFontStylePreset = (value: FontFaceStyle) => {
    setFontTabValues((current) => ({
      ...current,
      bold: value === "bold" || value === "boldItalic",
      italic: value === "italic" || value === "boldItalic",
    }));
  };

  const handleApply = () => {
    if (advancedValidationError()) {
      return;
    }
    const fontTab = fontTabValues();
    const advancedTab = advancedTabValues();
    const sizeNum = Number(fontTab.fontSize);
    const isValidSize = Number.isFinite(sizeNum) && sizeNum > 0;
    const underlineStyle =
      fontTab.underlineStyle === "none" ? null : fontTab.underlineStyle;
    const underline = underlineStyle !== null;
    const scale = advancedTab.characterScale.trim()
      ? parsePositiveNumber(advancedTab.characterScale)
      : null;
    const spacingAmount =
      advancedTab.spacingMode === "normal"
        ? null
        : parseNonNegativeNumber(advancedTab.spacingAmount);
    const positionAmount =
      advancedTab.positionMode === "normal"
        ? null
        : parseNonNegativeNumber(advancedTab.positionAmount);
    const kerningThreshold =
      advancedTab.kerningEnabled && advancedTab.kerningThreshold.trim()
        ? parseNonNegativeNumber(advancedTab.kerningThreshold)
        : null;
    const stylisticSet = parseStylisticSet(advancedTab.stylisticSet);
    props.onApply(
      {
        fontFamily: fontTab.fontFamily.trim()
          ? fontTab.fontFamily.trim()
          : null,
        fontSize: isValidSize ? sizeNum : null,
        colorMode: fontTab.colorMode,
        color: fontTab.colorMode === "automatic" ? null : fontTab.color || null,
        highlight: fontTab.highlight || null,
        shading: fontTab.shading || null,
        bold: fontTab.bold,
        italic: fontTab.italic,
        underline,
        underlineStyle,
        underlineColor: underline ? fontTab.underlineColor || null : null,
        strike: fontTab.strike,
        doubleStrike: fontTab.doubleStrike,
        superscript: fontTab.superscript,
        subscript: fontTab.subscript,
        smallCaps: fontTab.smallCaps,
        allCaps: fontTab.allCaps,
        hidden: fontTab.hidden,
        characterScale: scale,
        characterSpacing:
          spacingAmount === null
            ? null
            : advancedTab.spacingMode === "condensed"
              ? -spacingAmount
              : spacingAmount,
        baselineShift:
          positionAmount === null
            ? null
            : advancedTab.positionMode === "lowered"
              ? -positionAmount
              : positionAmount,
        kerningThreshold,
        ligatures: advancedTab.ligatures || null,
        numberSpacing: advancedTab.numberSpacing || null,
        numberForm: advancedTab.numberForm || null,
        stylisticSet,
        contextualAlternates: advancedTab.contextualAlternates,
      },
      props.initial,
    );
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("dialog.font.title")}
      onClose={props.onClose}
      class="oasis-editor-font-dialog"
      bodyClass="oasis-editor-font-dialog-body"
      size="font"
      footer={
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-font-dialog-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleApply}
            data-testid="editor-font-dialog-apply"
          >
            {t("generic.ok")}
          </button>
        </>
      }
    >
      <Tabs
        class="oasis-editor-font-dialog-tabs"
        ariaLabel={t("dialog.font.title")}
        value={activeTab()}
        onChange={(id) => setActiveTab(id as "font" | "advanced")}
        items={[
          {
            id: "font",
            label: t("dialog.font.tabFont"),
            testId: "editor-font-dialog-tab-font",
            panel: (
              <div class="oasis-editor-font-dialog-panel oasis-editor-font-dialog-font-panel">
                <div class="oasis-editor-dialog-row">
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.familyFilter")}
                    </label>
                    <input
                      class="oasis-editor-dialog-input"
                      value={fontTabValues().familyFilter}
                      onInput={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          familyFilter: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-family-filter"
                    />
                  </div>
                </div>
                <div class="oasis-editor-dialog-row">
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.family")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={fontTabValues().fontFamily}
                      onChange={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          fontFamily: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-family"
                    >
                      <option value="">—</option>
                      <For each={visibleFamilyOptions()}>
                        {(family) => <option value={family}>{family}</option>}
                      </For>
                    </select>
                  </div>
                  <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-size-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.size")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={fontTabValues().fontSize}
                      onChange={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          fontSize: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-size"
                    >
                      <option value="">—</option>
                      <For each={effectiveSizeOptions()}>
                        {(size) => <option value={String(size)}>{size}</option>}
                      </For>
                    </select>
                  </div>
                </div>
                <div class="oasis-editor-dialog-row">
                  <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-custom-size-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.customSize")}
                    </label>
                    <input
                      class="oasis-editor-dialog-input"
                      value={fontTabValues().fontSize}
                      onInput={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          fontSize: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-custom-size"
                    />
                    <span class="oasis-editor-dialog-help-text">
                      {customSizeError()}
                    </span>
                  </div>
                  <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-style-list-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.styleList")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={selectedFontStyle()}
                      onChange={(e) =>
                        applyFontStylePreset(
                          e.currentTarget.value as FontFaceStyle,
                        )
                      }
                      data-testid="editor-font-dialog-style-list"
                    >
                      <option value="regular">
                        {t("dialog.font.styleRegular")}
                      </option>
                      <option value="italic">
                        {t("dialog.font.styleItalic")}
                      </option>
                      <option value="bold">{t("dialog.font.styleBold")}</option>
                      <option value="boldItalic">
                        {t("dialog.font.styleBoldItalic")}
                      </option>
                    </select>
                  </div>
                </div>

                <div class="oasis-editor-dialog-row oasis-editor-font-dialog-color-row">
                  <div class="oasis-editor-dialog-input-group oasis-editor-font-dialog-color-mode-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.color")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={fontTabValues().colorMode}
                      onChange={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          colorMode: e.currentTarget.value as
                            | "automatic"
                            | "custom",
                        }))
                      }
                      data-testid="editor-font-dialog-color-mode"
                    >
                      <option value="automatic">
                        {t("toolbar.colorAutomatic")}
                      </option>
                      <option value="custom">
                        {t("dialog.font.customColor")}
                      </option>
                    </select>
                    <input
                      type="color"
                      class="oasis-editor-dialog-color"
                      value={fontTabValues().color}
                      disabled={fontTabValues().colorMode === "automatic"}
                      onInput={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          color: e.currentTarget.value,
                          colorMode: "custom",
                        }))
                      }
                      data-testid="editor-font-dialog-color"
                    />
                  </div>
                  <div class="oasis-editor-dialog-input-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.highlight")}
                    </label>
                    <input
                      type="color"
                      class="oasis-editor-dialog-color"
                      value={fontTabValues().highlight || DEFAULT_HIGHLIGHT}
                      onInput={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          highlight: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-highlight"
                    />
                  </div>
                  <div class="oasis-editor-dialog-input-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.shading")}
                    </label>
                    <input
                      type="color"
                      class="oasis-editor-dialog-color"
                      value={fontTabValues().shading || DEFAULT_SHADING}
                      onInput={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          shading: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-shading"
                    />
                  </div>
                </div>

                <div class="oasis-editor-dialog-row">
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.underlineStyle")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={fontTabValues().underlineStyle}
                      onChange={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          underlineStyle: e.currentTarget
                            .value as UnderlineStyleValue,
                          underline: e.currentTarget.value !== "none",
                        }))
                      }
                      data-testid="editor-font-dialog-underline-style"
                    >
                      <option value="none">
                        {t("toolbar.underlineRemove")}
                      </option>
                      <For each={UNDERLINE_STYLE_OPTIONS}>
                        {(option) => (
                          <option value={option.value}>{option.label}</option>
                        )}
                      </For>
                    </select>
                  </div>
                  <div class="oasis-editor-dialog-input-group">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.underlineColor")}
                    </label>
                    <input
                      type="color"
                      class="oasis-editor-dialog-color"
                      value={fontTabValues().underlineColor || DEFAULT_COLOR}
                      disabled={fontTabValues().underlineStyle === "none"}
                      onInput={(e) =>
                        setFontTabValues((current) => ({
                          ...current,
                          underlineColor: e.currentTarget.value,
                          underline: current.underlineStyle !== "none",
                        }))
                      }
                      data-testid="editor-font-dialog-underline-color"
                    />
                  </div>
                </div>

                <div class="oasis-editor-dialog-row">
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.style")}
                    </label>
                    <div class="oasis-editor-dialog-style-row">
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().bold}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              bold: e.currentTarget.checked,
                            }))
                          }
                          data-testid="editor-font-dialog-bold"
                        />
                        <span style={{ "font-weight": 700 }}>
                          {t("dialog.font.bold")}
                        </span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().italic}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              italic: e.currentTarget.checked,
                            }))
                          }
                          data-testid="editor-font-dialog-italic"
                        />
                        <span style={{ "font-style": "italic" }}>
                          {t("dialog.font.italic")}
                        </span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().underline}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              underline: e.currentTarget.checked,
                              underlineStyle: e.currentTarget.checked
                                ? current.underlineStyle === "none"
                                  ? "single"
                                  : current.underlineStyle
                                : "none",
                            }))
                          }
                          data-testid="editor-font-dialog-underline"
                        />
                        <span style={{ "text-decoration": "underline" }}>
                          {t("dialog.font.underline")}
                        </span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().strike}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              strike: e.currentTarget.checked,
                              doubleStrike: e.currentTarget.checked
                                ? false
                                : current.doubleStrike,
                            }))
                          }
                          data-testid="editor-font-dialog-strike"
                        />
                        <span style={{ "text-decoration": "line-through" }}>
                          {t("dialog.font.strike")}
                        </span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().doubleStrike}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              doubleStrike: e.currentTarget.checked,
                              strike: e.currentTarget.checked
                                ? false
                                : current.strike,
                            }))
                          }
                          data-testid="editor-font-dialog-double-strike"
                        />
                        <span>{t("dialog.font.doubleStrike")}</span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().superscript}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              superscript: e.currentTarget.checked,
                              subscript: e.currentTarget.checked
                                ? false
                                : current.subscript,
                            }))
                          }
                          data-testid="editor-font-dialog-superscript"
                        />
                        <span>{t("toolbar.superscript")}</span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().subscript}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              subscript: e.currentTarget.checked,
                              superscript: e.currentTarget.checked
                                ? false
                                : current.superscript,
                            }))
                          }
                          data-testid="editor-font-dialog-subscript"
                        />
                        <span>{t("toolbar.subscript")}</span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().smallCaps}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              smallCaps: e.currentTarget.checked,
                            }))
                          }
                          data-testid="editor-font-dialog-small-caps"
                        />
                        <span>{t("dialog.font.smallCaps")}</span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().allCaps}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              allCaps: e.currentTarget.checked,
                            }))
                          }
                          data-testid="editor-font-dialog-all-caps"
                        />
                        <span>{t("dialog.font.allCaps")}</span>
                      </label>
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="checkbox"
                          checked={fontTabValues().hidden}
                          onChange={(e) =>
                            setFontTabValues((current) => ({
                              ...current,
                              hidden: e.currentTarget.checked,
                            }))
                          }
                          data-testid="editor-font-dialog-hidden"
                        />
                        <span>{t("dialog.font.hidden")}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div class="oasis-editor-dialog-input-group">
                  <label class="oasis-editor-dialog-label">
                    {t("dialog.font.preview")}
                  </label>
                  <div
                    class="oasis-editor-dialog-preview"
                    data-testid="editor-font-dialog-preview"
                    style={previewStyle()}
                  >
                    {t("dialog.font.previewText")}
                  </div>
                </div>
              </div>
            ),
          },
          {
            id: "advanced",
            label: t("dialog.font.tabAdvanced"),
            testId: "editor-font-dialog-tab-advanced",
            panel: (
              <div class="oasis-editor-font-dialog-panel oasis-editor-font-dialog-advanced-panel">
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>
                    {t("dialog.font.advancedCharacterSpacingGroup")}
                  </legend>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedScale")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().characterScale || "100"}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          characterScale: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-scale"
                    >
                      <For each={WORD_CHARACTER_SCALES}>
                        {(scale) => (
                          <option value={String(scale)}>{scale}%</option>
                        )}
                      </For>
                    </select>
                  </div>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedSpacing")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().spacingMode}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          spacingMode: e.currentTarget
                            .value as AdvancedTabValues["spacingMode"],
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-spacing-mode"
                    >
                      <option value="normal">
                        {t("dialog.font.advancedNormal")}
                      </option>
                      <option value="expanded">
                        {t("dialog.font.advancedExpanded")}
                      </option>
                      <option value="condensed">
                        {t("dialog.font.advancedCondensed")}
                      </option>
                    </select>
                    <label class="oasis-editor-dialog-label oasis-editor-font-dialog-by-label">
                      {t("dialog.font.advancedBy")}
                    </label>
                    <input
                      class="oasis-editor-dialog-input oasis-editor-font-dialog-small-input"
                      value={advancedTabValues().spacingAmount}
                      disabled={advancedTabValues().spacingMode === "normal"}
                      onInput={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          spacingAmount: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-spacing-amount"
                    />
                  </div>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedPosition")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().positionMode}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          positionMode: e.currentTarget
                            .value as AdvancedTabValues["positionMode"],
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-position-mode"
                    >
                      <option value="normal">
                        {t("dialog.font.advancedNormal")}
                      </option>
                      <option value="raised">
                        {t("dialog.font.advancedRaised")}
                      </option>
                      <option value="lowered">
                        {t("dialog.font.advancedLowered")}
                      </option>
                    </select>
                    <label class="oasis-editor-dialog-label oasis-editor-font-dialog-by-label">
                      {t("dialog.font.advancedBy")}
                    </label>
                    <input
                      class="oasis-editor-dialog-input oasis-editor-font-dialog-small-input"
                      value={advancedTabValues().positionAmount}
                      disabled={advancedTabValues().positionMode === "normal"}
                      onInput={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          positionAmount: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-position-amount"
                    />
                  </div>
                  <div class="oasis-editor-font-dialog-word-row oasis-editor-font-dialog-kerning-row">
                    <label class="oasis-editor-dialog-style-toggle oasis-editor-font-dialog-kerning-toggle">
                      <input
                        type="checkbox"
                        checked={advancedTabValues().kerningEnabled}
                        onChange={(e) =>
                          setAdvancedTabValues((current) => ({
                            ...current,
                            kerningEnabled: e.currentTarget.checked,
                            kerningThreshold: e.currentTarget.checked
                              ? current.kerningThreshold || "1"
                              : current.kerningThreshold,
                          }))
                        }
                        data-testid="editor-font-dialog-advanced-kerning-enabled"
                      />
                      <span>{t("dialog.font.advancedKerning")}</span>
                    </label>
                    <input
                      class="oasis-editor-dialog-input oasis-editor-font-dialog-kerning-input"
                      value={advancedTabValues().kerningThreshold}
                      disabled={!advancedTabValues().kerningEnabled}
                      onInput={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          kerningThreshold: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-kerning"
                    />
                    <span class="oasis-editor-dialog-help-text oasis-editor-font-dialog-kerning-suffix">
                      {t("dialog.font.advancedKerningAbove")}
                    </span>
                  </div>
                </fieldset>

                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("dialog.font.advancedOpenTypeGroup")}</legend>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedLigatures")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().ligatures}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          ligatures: e.currentTarget.value as
                            | EditorLigatures
                            | "",
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-ligatures"
                    >
                      <option value="">
                        {t("dialog.font.advancedDefault")}
                      </option>
                      <option value="none">
                        {t("dialog.font.advancedLigaturesNone")}
                      </option>
                      <option value="standard">
                        {t("dialog.font.advancedLigaturesStandard")}
                      </option>
                      <option value="contextual">
                        {t("dialog.font.advancedLigaturesContextual")}
                      </option>
                      <option value="historical">
                        {t("dialog.font.advancedLigaturesHistorical")}
                      </option>
                      <option value="standardContextual">
                        {t("dialog.font.advancedLigaturesStandardContextual")}
                      </option>
                    </select>
                  </div>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedNumberSpacing")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().numberSpacing}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          numberSpacing: e.currentTarget.value as
                            | EditorNumberSpacing
                            | "",
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-number-spacing"
                    >
                      <option value="">
                        {t("dialog.font.advancedDefault")}
                      </option>
                      <option value="proportional">
                        {t("dialog.font.advancedNumberSpacingProportional")}
                      </option>
                      <option value="tabular">
                        {t("dialog.font.advancedNumberSpacingTabular")}
                      </option>
                    </select>
                  </div>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedNumberForm")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().numberForm}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          numberForm: e.currentTarget.value as
                            | EditorNumberForm
                            | "",
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-number-form"
                    >
                      <option value="">
                        {t("dialog.font.advancedDefault")}
                      </option>
                      <option value="lining">
                        {t("dialog.font.advancedNumberFormLining")}
                      </option>
                      <option value="oldStyle">
                        {t("dialog.font.advancedNumberFormOldStyle")}
                      </option>
                    </select>
                  </div>
                  <div class="oasis-editor-font-dialog-word-row">
                    <label class="oasis-editor-dialog-label">
                      {t("dialog.font.advancedStylisticSet")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={advancedTabValues().stylisticSet}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          stylisticSet: e.currentTarget.value,
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-stylistic-set"
                    >
                      <option value="">
                        {t("dialog.font.advancedDefault")}
                      </option>
                      <For
                        each={Array.from(
                          { length: 20 },
                          (_, index) => index + 1,
                        )}
                      >
                        {(set) => <option value={String(set)}>{set}</option>}
                      </For>
                    </select>
                  </div>
                  <label class="oasis-editor-dialog-style-toggle oasis-editor-font-dialog-contextual-toggle">
                    <input
                      type="checkbox"
                      checked={advancedTabValues().contextualAlternates}
                      onChange={(e) =>
                        setAdvancedTabValues((current) => ({
                          ...current,
                          contextualAlternates: e.currentTarget.checked,
                        }))
                      }
                      data-testid="editor-font-dialog-advanced-contextual-alternates"
                    />
                    <span>{t("dialog.font.advancedContextualAlternates")}</span>
                  </label>
                </fieldset>

                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("dialog.font.advancedPreviewGroup")}</legend>
                  <div
                    class="oasis-editor-dialog-preview oasis-editor-font-dialog-advanced-preview"
                    style={previewStyle()}
                    data-testid="editor-font-dialog-advanced-preview"
                  >
                    {t("dialog.font.previewText")}
                  </div>
                </fieldset>

                <p
                  class="oasis-editor-dialog-help-text"
                  data-testid="editor-font-dialog-advanced-placeholder"
                >
                  {advancedValidationError() ||
                    t("dialog.font.advancedPlaceholder")}
                </p>
              </div>
            ),
          },
        ]}
      />
    </Dialog>
  );
}
