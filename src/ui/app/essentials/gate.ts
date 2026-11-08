import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { EssentialsFeatureGate } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

/**
 * Commands that do not mutate document content must remain usable in read-only
 * mode, including access to copying, searching, exports, and view options.
 */
const READ_ONLY_SAFE_COMMANDS: ReadonlySet<OasisBuiltinCommand> = new Set([
  "copy",
  "selectAll",
  "nextRevision",
  "previousRevision",
  "nextComment",
  "previousComment",
  "find",
  "replace",
  "print",
  "exportDocx",
  "exportPdf",
  "toggleShowMargins",
  "toggleShowParagraphMarks",
  "togglePreciseFonts",
]);

export function buildEssentialsGate(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsFeatureGate {
  return {
    isCommandEnabled: (commandName: OasisBuiltinCommand): boolean => {
      if (commandName === "openSymbolDialog") return true;
      if (commandName === "openEquationDialog") return true;
      return (
        (READ_ONLY_SAFE_COMMANDS.has(commandName) || !options.isReadOnly()) &&
        (commandName !== "insertFootnote" ||
          options.commandsController.canInsertFootnoteCommand())
      );
    },
  };
}
