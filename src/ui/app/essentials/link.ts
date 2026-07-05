import { isSelectionCollapsed } from "@/core/selection.js";
import type { EssentialsLinkCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsLink(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsLinkCapability {
  return {
    prompt: (): void => options.commandsController.promptForLink(),
    remove: (): void => options.commandsController.removeLinkCommand(),
    canPrompt: (): boolean =>
      !isSelectionCollapsed(options.state().selection) ||
      Boolean(options.styleController.toolbarStyleState().link),
  };
}
