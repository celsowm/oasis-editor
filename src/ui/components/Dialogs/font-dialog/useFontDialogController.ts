import { createEffect, createMemo, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import {
  parseNonNegativeNumber,
  parsePositiveNumber,
  parseStylisticSet,
  resolveFontFaceStyle,
  createFontTabValuesFromInitial,
  createAdvancedTabValuesFromInitial,
  buildFontDialogPreviewStyle,
  buildFontDialogApplyValues,
} from "@/ui/components/Dialogs/FontDialogModel.js";
import { WORD_FONT_SIZES } from "./FontDialogTypes.js";
import type {
  FontDialogProps,
  FontTabValues,
  AdvancedTabValues,
  FontDialogTab,
  FontStylePreset,
} from "./FontDialogTypes.js";
import type { FontDialogController } from "./FontDialogController.js";

export function useFontDialogController(
  props: FontDialogProps,
): FontDialogController {
  const t = useI18n();
  const [activeTab, setActiveTab] = createSignal<FontDialogTab>("font");
  const [fontTabValues, setFontTabValues] = createSignal<FontTabValues>(
    createFontTabValuesFromInitial(props.initial),
  );
  const [advancedTabValues, setAdvancedTabValues] =
    createSignal<AdvancedTabValues>(
      createAdvancedTabValuesFromInitial(props.initial),
    );

  createEffect(() => {
    if (props.isOpen) {
      setActiveTab("font");
      setFontTabValues(createFontTabValuesFromInitial(props.initial));
      setAdvancedTabValues(createAdvancedTabValuesFromInitial(props.initial));
    }
  });

  const selectedFontStyle = createMemo<FontStylePreset>(() =>
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
  const previewStyle = createMemo(() =>
    buildFontDialogPreviewStyle(fontTabValues(), advancedTabValues()),
  );

  const applyFontStylePreset = (value: FontStylePreset) => {
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
    const font = fontTabValues();
    const advanced = advancedTabValues();
    const values = buildFontDialogApplyValues(font, advanced);
    props.onApply(values, props.initial);
    props.onClose();
  };

  const updateFontTab = <K extends keyof FontTabValues>(
    key: K,
    value: FontTabValues[K],
  ) => {
    setFontTabValues((current) => ({ ...current, [key]: value }));
  };

  const updateAdvancedTab = <K extends keyof AdvancedTabValues>(
    key: K,
    value: AdvancedTabValues[K],
  ) => {
    setAdvancedTabValues((current) => ({ ...current, [key]: value }));
  };

  return {
    activeTab,
    setActiveTab: (tab) => setActiveTab(tab),
    fontTabValues,
    setFontTabValues,
    advancedTabValues,
    setAdvancedTabValues,
    updateFontTab,
    updateAdvancedTab,
    selectedFontStyle,
    visibleFamilyOptions,
    effectiveSizeOptions,
    customSizeError,
    advancedValidationError,
    previewStyle,
    applyFontStylePreset,
    handleApply,
  };
}
