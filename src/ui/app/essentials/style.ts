import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";
import type { EssentialsStyleCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsStyle(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsStyleCapability {
  return {
    state: (): ToolbarStyleState => options.styleController.toolbarStyleState(),
  };
}
