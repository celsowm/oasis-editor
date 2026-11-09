import {
  getActiveSectionIndex,
  type EditorColumnsSettings,
  type EditorPageMargins,
  type EditorPageNumbering,
} from "@/core/model.js";
import { setSectionPageNumbering } from "@/core/commands/pageNumber.js";
import {
  getActivePaperSize,
  getActiveColumns,
  getSectionBidi,
  getSectionVerticalAlign,
  setSectionBidi,
  setSectionColumns,
  setSectionMarginsPreset,
  setSectionPaperSize,
  setSectionPaperSizePreset,
  setSectionVerticalAlign,
} from "@/core/commands/pageSetup.js";
import {
  getHyphenationSettings,
  setHyphenationSettings,
} from "@/core/commands/hyphenation.js";
import type { EssentialsSectionCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsSection(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsSectionCapability {
  const section: EssentialsSectionCapability = {
    isLandscape: (): boolean => {
      const idx = getActiveSectionIndex(options.state());
      const target =
        options.state().document.sections?.[idx] ?? options.state().document;
      return target?.pageSettings?.orientation === "landscape";
    },
    setOrientation: (orientation: "portrait" | "landscape"): void => {
      const idx = getActiveSectionIndex(options.state());
      const target =
        options.state().document.sections?.[idx] ?? options.state().document;
      if (!target) return;
      options.commandsController.applyUpdateSectionSettingsCommand(idx, {
        pageSettings: {
          ...target.pageSettings!,
          orientation,
        },
      });
    },
    toggleOrientation: (): void => {
      const idx = getActiveSectionIndex(options.state());
      const target =
        options.state().document.sections?.[idx] ?? options.state().document;
      if (!target) return;
      const current = target.pageSettings?.orientation ?? "portrait";
      section.setOrientation(current === "portrait" ? "landscape" : "portrait");
    },
    breakNextPage: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("nextPage"),
    breakContinuous: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("continuous"),
    breakEvenPage: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("evenPage"),
    breakOddPage: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("oddPage"),
    breakNextColumn: (): void =>
      options.commandsController.applyInsertSectionBreakCommand("nextColumn"),
    getMargins: (): EditorPageMargins | undefined => {
      const idx = getActiveSectionIndex(options.state());
      const target =
        options.state().document.sections?.[idx] ?? options.state().document;
      return target?.pageSettings?.margins;
    },
    setPageMargins: (margins: Partial<EditorPageMargins>): void => {
      const idx = getActiveSectionIndex(options.state());
      const target =
        options.state().document.sections?.[idx] ?? options.state().document;
      if (!target?.pageSettings) return;
      options.commandsController.applyUpdateSectionSettingsCommand(idx, {
        pageSettings: {
          ...target.pageSettings,
          margins: {
            ...target.pageSettings.margins,
            ...margins,
          },
        },
      });
    },
    setMarginsPreset: (presetId: string): void => {
      options.applyTransactionalState((state) =>
        setSectionMarginsPreset(state, presetId),
      );
      options.focusInput();
    },
    getPageNumbering: (): EditorPageNumbering | undefined => {
      const idx = getActiveSectionIndex(options.state());
      return options.state().document.sections?.[idx]?.pageNumbering;
    },
    setPageNumbering: (numbering): void => {
      options.applyTransactionalState((state) =>
        setSectionPageNumbering(state, numbering),
      );
      options.focusInput();
    },
    getPaperSize: (): { widthPt: number; heightPt: number } | undefined =>
      getActivePaperSize(options.state()),
    setPaperSize: (dimensions): void => {
      options.applyTransactionalState((state) =>
        setSectionPaperSize(state, dimensions),
      );
      options.focusInput();
    },
    setPaperSizePreset: (presetId): void => {
      options.applyTransactionalState((state) =>
        setSectionPaperSizePreset(state, presetId),
      );
      options.focusInput();
    },
    getColumns: (): EditorColumnsSettings | undefined =>
      getActiveColumns(options.state()),
    setColumns: (columns): void => {
      options.applyTransactionalState((state) =>
        setSectionColumns(state, columns),
      );
      options.focusInput();
    },
    getVerticalAlign: () => getSectionVerticalAlign(options.state()),
    setVerticalAlign: (align): void => {
      options.applyTransactionalState((state) =>
        setSectionVerticalAlign(state, align),
      );
      options.focusInput();
    },
    getSectionStart: () => {
      const idx = getActiveSectionIndex(options.state());
      return options.state().document.sections?.[idx]?.breakType;
    },
    setSectionStart: (breakType): void => {
      const idx = getActiveSectionIndex(options.state());
      const target =
        options.state().document.sections?.[idx] ?? options.state().document;
      if (!target) return;
      options.commandsController.applyUpdateSectionSettingsCommand(idx, {
        breakType,
      });
    },
    getBidi: () => getSectionBidi(options.state()),
    setBidi: (enabled): void => {
      options.applyTransactionalState((state) =>
        setSectionBidi(state, enabled),
      );
      options.focusInput();
    },
    getHyphenation: () => getHyphenationSettings(options.state()),
    setHyphenation: (input): void => {
      options.applyTransactionalState((state) =>
        setHyphenationSettings(state, input),
      );
      options.focusInput();
    },
  };
  return section;
}
