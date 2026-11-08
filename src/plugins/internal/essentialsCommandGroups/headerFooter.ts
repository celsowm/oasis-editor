import type { OasisPlugin } from "@/core/plugin.js";
import type {
  ActionCommandBuilder,
  CommandBuilder,
} from "../essentialsCommandBuilders.js";
import type {
  EssentialsFeatureGate,
  EssentialsHeaderFooterCapability,
} from "../essentialsCapabilities.js";

interface HeaderFooterGroupDeps {
  gate: EssentialsFeatureGate;
  headerFooter: EssentialsHeaderFooterCapability;
  command: CommandBuilder;
  actionCommand: ActionCommandBuilder;
}

export function buildHeaderFooterCommands({
  gate,
  headerFooter,
  command,
  actionCommand,
}: HeaderFooterGroupDeps): NonNullable<OasisPlugin["commands"]> {
  return {
    editHeader: command("editHeader", (): boolean => {
      headerFooter.editHeader();
      return true;
    }),
    editFooter: command("editFooter", (): boolean => {
      headerFooter.editFooter();
      return true;
    }),
    insertPageNumber: command("insertPageNumber", (): boolean => {
      headerFooter.insertPageNumber();
      return true;
    }),
    exitHeaderFooter: actionCommand(
      "exitHeaderFooter",
      (): void => headerFooter.exit(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("exitHeaderFooter") &&
          headerFooter.isInHeaderFooter(),
      }),
    ),
  };
}
