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
    editFirstPageHeader: command("editFirstPageHeader", (): boolean => {
      headerFooter.editFirstPageHeader();
      return true;
    }),
    editEvenPageHeader: command("editEvenPageHeader", (): boolean => {
      headerFooter.editEvenPageHeader();
      return true;
    }),
    editFirstPageFooter: command("editFirstPageFooter", (): boolean => {
      headerFooter.editFirstPageFooter();
      return true;
    }),
    editEvenPageFooter: command("editEvenPageFooter", (): boolean => {
      headerFooter.editEvenPageFooter();
      return true;
    }),
    insertPageNumber: command("insertPageNumber", (): boolean => {
      headerFooter.insertPageNumber();
      return true;
    }),
    insertPageNumberXOfY: command("insertPageNumberXOfY", (): boolean => {
      headerFooter.insertPageNumberXOfY();
      return true;
    }),
    placePageNumberTop: command("placePageNumberTop", (): boolean => {
      headerFooter.placePageNumberTop();
      return true;
    }),
    placePageNumberBottom: command("placePageNumberBottom", (): boolean => {
      headerFooter.placePageNumberBottom();
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
    setDifferentFirstPage: actionCommand(
      "setDifferentFirstPage",
      (p): void => {
        const on = (p ?? undefined) as boolean | undefined;
        headerFooter.setDifferentFirstPage(on ?? true);
      },
      (): { value: boolean | undefined } => ({
        value: headerFooter.getDifferentFirstPage(),
      }),
    ),
    setDifferentOddEven: actionCommand(
      "setDifferentOddEven",
      (p): void => {
        const on = (p ?? undefined) as boolean | undefined;
        headerFooter.setDifferentOddEven(on ?? true);
      },
      (): { value: boolean | undefined } => ({
        value: headerFooter.getDifferentOddEven(),
      }),
    ),
  };
}
