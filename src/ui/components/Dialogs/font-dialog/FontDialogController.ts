import type { Accessor, Setter } from "solid-js";
import type {
  FontDialogTab,
  FontTabValues,
  AdvancedTabValues,
  FontStylePreset,
} from "./FontDialogTypes.js";

export interface FontDialogController {
  activeTab: Accessor<FontDialogTab>;
  setActiveTab: (tab: FontDialogTab) => void;
  fontTabValues: Accessor<FontTabValues>;
  setFontTabValues: Setter<FontTabValues>;
  advancedTabValues: Accessor<AdvancedTabValues>;
  setAdvancedTabValues: Setter<AdvancedTabValues>;
  updateFontTab: <K extends keyof FontTabValues>(
    key: K,
    value: FontTabValues[K],
  ) => void;
  updateAdvancedTab: <K extends keyof AdvancedTabValues>(
    key: K,
    value: AdvancedTabValues[K],
  ) => void;
  selectedFontStyle: Accessor<FontStylePreset>;
  visibleFamilyOptions: Accessor<string[]>;
  effectiveSizeOptions: Accessor<number[]>;
  customSizeError: Accessor<string>;
  advancedValidationError: Accessor<string>;
  previewStyle: Accessor<Record<string, string | number | undefined>>;
  applyFontStylePreset: (preset: FontStylePreset) => void;
  handleApply: () => void;
}
