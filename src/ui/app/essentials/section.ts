import { getActiveSectionIndex, type EditorPageMargins } from "@/core/model.js";
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
  };
  return section;
}
