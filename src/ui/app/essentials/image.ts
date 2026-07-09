import type { EssentialsImageCapability } from "@/plugins/internal/essentialsCapabilities.js";
import { getSelectedImageSizeCm } from "@/core/commands/image.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsImage(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsImageCapability {
  return {
    promptAlt: (): void => options.commandsController.promptForImageAlt(),
    promptCaption: (): void =>
      options.commandsController.promptForImageCaption(),
    isSelected: (): boolean => Boolean(options.selectedImageRun()),
    getSizeCm: (): { width: number; height: number } | null =>
      getSelectedImageSizeCm(options.state()),
    setWidthCm: (cm): void =>
      options.commandsController.applyImageWidthCmCommand(cm),
    setHeightCm: (cm): void =>
      options.commandsController.applyImageHeightCmCommand(cm),
    isCropActive: (): boolean => options.imageCropMode.isActive(),
    toggleCrop: (): void => options.imageCropMode.toggle(),
    applyCropAspect: (preset): void =>
      options.commandsController.applyImageCropAspectCommand(preset),
  };
}
