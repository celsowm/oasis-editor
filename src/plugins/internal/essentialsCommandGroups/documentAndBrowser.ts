import type { OasisPlugin } from "@/core/plugin.js";
import type { EditorImageBorder } from "@/core/model.js";
import type { ImageBorderPatch } from "@/core/commands/image.js";
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
    newDocument: actionCommand("newDocument", (): void =>
      document.newDocument(),
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
    openSymbolDialog: actionCommand("openSymbolDialog", (): void =>
      document.openSymbolDialog(),
    ),
    openEquationDialog: actionCommand("openEquationDialog", (): void =>
      document.openEquationDialog(),
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
    imageContext: actionCommand(
      "imageContext",
      (): void => {},
      (): { isEnabled: boolean; isActive: boolean; value: null } => ({
        isEnabled: image.isSelected(),
        isActive: image.isSelected(),
        value: null,
      }),
    ),
    imageWidthCm: actionCommand(
      "imageWidthCm",
      (p): void => image.setWidthCm(Number(p)),
      (): { isEnabled: boolean; value: number | null } => ({
        isEnabled: image.isSelected(),
        value: image.getSizeCm()?.width ?? null,
      }),
    ),
    imageHeightCm: actionCommand(
      "imageHeightCm",
      (p): void => image.setHeightCm(Number(p)),
      (): { isEnabled: boolean; value: number | null } => ({
        isEnabled: image.isSelected(),
        value: image.getSizeCm()?.height ?? null,
      }),
    ),
    imageCrop: actionCommand(
      "imageCrop",
      (): void => image.toggleCrop(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: image.isSelected(),
        isActive: image.isCropActive(),
      }),
    ),
    imageCropAspect: actionCommand(
      "imageCropAspect",
      (p): void => image.applyCropAspect(String(p)),
      (): { isEnabled: boolean } => ({
        isEnabled: image.isSelected(),
      }),
    ),
    imageCropShape: actionCommand(
      "imageCropShape",
      (p): void => image.applyCropShape(String(p)),
      (): { isEnabled: boolean; value: string | null } => ({
        isEnabled: image.isSelected(),
        value: image.getCropShape(),
      }),
    ),
    imageCropFill: actionCommand(
      "imageCropFill",
      (): void => image.applyCropFill(),
      (): { isEnabled: boolean } => ({ isEnabled: image.isSelected() }),
    ),
    imageCropFit: actionCommand(
      "imageCropFit",
      (): void => image.applyCropFit(),
      (): { isEnabled: boolean } => ({ isEnabled: image.isSelected() }),
    ),
    imageCropReset: actionCommand(
      "imageCropReset",
      (): void => image.resetCrop(),
      (): { isEnabled: boolean } => ({ isEnabled: image.isSelected() }),
    ),
    imageBorder: actionCommand(
      "imageBorder",
      (p): void => image.setBorder(p as ImageBorderPatch),
      (): { isEnabled: boolean; value: EditorImageBorder | null } => ({
        isEnabled: image.isSelected(),
        value: image.getBorder(),
      }),
    ),
  };
}
