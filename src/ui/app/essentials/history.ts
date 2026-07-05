import type { EssentialsHistoryCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsHistory(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsHistoryCapability {
  return {
    canUndo: (): boolean => options.undoStack().length > 0,
    canRedo: (): boolean => options.redoStack().length > 0,
    undo: (): true => (options.historyActions.performUndo(), true),
    redo: (): true => (options.historyActions.performRedo(), true),
  };
}
