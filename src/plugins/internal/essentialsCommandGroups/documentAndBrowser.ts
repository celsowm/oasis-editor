import type { OasisPlugin } from "@/core/plugin.js";
import type { ActionCommandBuilder } from "../essentialsCommandBuilders.js";
import type {
  EssentialsBrowserCapability,
  EssentialsDocumentCapability,
  EssentialsFeatureGate,
  EssentialsImageCapability,
  EssentialsLinkCapability,
  EssentialsStyleCapability,
} from "../essentialsCapabilities.js";
import type { EssentialsDocumentStyleDescriptor } from "@/plugins/internal/essentialsCapabilities.js";

interface DocumentAndBrowserGroupDeps {
  gate: EssentialsFeatureGate;
  style: EssentialsStyleCapability;
  document: EssentialsDocumentCapability;
  link: EssentialsLinkCapability;
  image: EssentialsImageCapability;
  browser: EssentialsBrowserCapability;
  actionCommand: ActionCommandBuilder;
}

export function buildDocumentAndBrowserCommands({
  gate,
  style,
  document,
  link,
  image,
  browser,
  actionCommand,
}: DocumentAndBrowserGroupDeps): NonNullable<OasisPlugin["commands"]> {
  const s = style.state;
  return {
    documentStyles: actionCommand(
      "documentStyles",
      (): void => {},
      (): { isEnabled: true; value: EssentialsDocumentStyleDescriptor[] } => ({
        isEnabled: true,
        value: document.documentStyles(),
      }),
    ),
    print: actionCommand(
      "print",
      (): void => browser.print(),
      (): { isEnabled: true } => ({ isEnabled: true }),
    ),
    copy: actionCommand(
      "copy",
      (): void => browser.copy(),
      (): { isEnabled: true } => ({ isEnabled: true }),
    ),
    exportDocx: actionCommand("exportDocx", (): void => document.exportDocx()),
    exportPdf: actionCommand("exportPdf", (): void => document.exportPdf()),
    importDocument: actionCommand("importDocument", (): void =>
      document.importDocument(),
    ),
    insertImage: actionCommand("insertImage", (): void =>
      document.insertImage(),
    ),
    insertShape: actionCommand("insertShape", (p): void =>
      document.insertShape(String(p)),
    ),
    unlink: actionCommand(
      "unlink",
      (): void => link.remove(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: gate.isCommandEnabled("unlink") && Boolean(s().link),
        isActive: Boolean(s().link),
      }),
    ),
    editImageAlt: actionCommand(
      "editImageAlt",
      (): void => image.promptAlt(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: image.isSelected(),
        isActive: image.isSelected(),
      }),
    ),
    insertImageCaption: actionCommand(
      "insertImageCaption",
      (): void => image.promptCaption(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: image.isSelected(),
        isActive: image.isSelected(),
      }),
    ),
  };
}
