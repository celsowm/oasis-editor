import type { OasisPlugin } from "@/core/plugin.js";
import type { ActionCommandBuilder } from "../essentialsCommandBuilders.js";
import type { EssentialsDialogCapability } from "../essentialsCapabilities.js";

interface LauncherGroupDeps {
  dialog: EssentialsDialogCapability;
  actionCommand: ActionCommandBuilder;
}

/**
 * Ribbon group dialog launchers. Each command opens the same dialog as its
 * context-menu/menubar counterpart, so the launcher is a real entry point
 * rather than a decorative button.
 */
export function buildLauncherCommands({
  dialog,
  actionCommand,
}: LauncherGroupDeps): NonNullable<OasisPlugin["commands"]> {
  return {
    openFontDialog: actionCommand("openFontDialog", (): void => {
      dialog.openFontDialog();
    }),
    openParagraphDialog: actionCommand("openParagraphDialog", (): void => {
      dialog.openParagraphDialog();
    }),
  };
}
