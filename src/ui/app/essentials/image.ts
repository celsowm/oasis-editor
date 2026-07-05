import type { EssentialsImageCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsImage(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsImageCapability {
  return {
    promptAlt: (): void => options.commandsController.promptForImageAlt(),
    promptCaption: (): void =>
      options.commandsController.promptForImageCaption(),
    isSelected: (): boolean => Boolean(options.selectedImageRun()),
  };
}
