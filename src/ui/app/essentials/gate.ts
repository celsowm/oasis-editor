import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { EssentialsFeatureGate } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsGate(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsFeatureGate {
  return {
    isCommandEnabled: (commandName: OasisBuiltinCommand): boolean =>
      !options.isReadOnly() &&
      (commandName !== "insertFootnote" ||
        options.commandsController.canInsertFootnoteCommand()),
  };
}
