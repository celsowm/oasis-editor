import { isSelectionCollapsed } from "@/core/selection.js";
import type { EssentialsSelectionCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsSelection(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsSelectionCapability {
  return {
    isCollapsed: (): boolean => isSelectionCollapsed(options.state().selection),
  };
}
