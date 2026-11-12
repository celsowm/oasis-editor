import type { OasisPlugin } from "@/core/plugin.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
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
  /**
   * Picture Format edits are document mutations, so they follow the same
   * read-only gate as every other editing command. The image capability only
   * reports whether an image is selected, which is why these commands used to
   * stay enabled — and silently resize or crop — in a read-only document.
   */
  const canEditImage = (name: OasisBuiltinCommand): boolean =>
    gate.isCommandEnabled(name) && image.isSelected();
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
      (): void => document.printDocument(),
      (): { isEnabled: true } => ({ isEnabled: true }),
    ),
    paste: actionCommand(
      "paste",
      (): void => browser.paste(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("paste") && browser.canPaste(),
      }),
    ),
    pasteAsPlainText: actionCommand(
      "pasteAsPlainText",
      (): void => browser.pasteAsPlainText(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("pasteAsPlainText") && browser.canPaste(),
      }),
    ),
    cut: actionCommand(
      "cut",
      (): void => browser.cut(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("cut") &&
          browser.hasSelection() &&
          browser.canCut(),
      }),
    ),
    pasteMergeFormatting: actionCommand(
      "pasteMergeFormatting",
      (): void => browser.pasteMergeFormatting(),
      (): { isEnabled: boolean } => ({
        isEnabled:
          gate.isCommandEnabled("pasteMergeFormatting") && browser.canPaste(),
      }),
    ),
    copy: actionCommand(
      "copy",
      (): void => browser.copy(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("copy") && browser.hasSelection(),
      }),
    ),
    newDocument: actionCommand("newDocument", (): void =>
      document.newDocument(),
    ),
    saveDocument: actionCommand("saveDocument", (): void =>
      document.saveDocument(),
    ),
    exportDocx: actionCommand("exportDocx", (): void => document.exportDocx()),
    exportPdf: actionCommand("exportPdf", (): void => document.exportPdf()),
    importDocument: actionCommand("importDocument", (): void =>
      document.importDocument(),
    ),
    insertHtml: actionCommand("insertHtml", (payload): void => {
      if (
        !payload ||
        typeof payload !== "object" ||
        typeof (payload as { html?: unknown }).html !== "string"
      ) {
        throw new TypeError(
          "insertHtml requires a payload with a string html property.",
        );
      }
      document.insertHtml((payload as { html: string }).html);
    }),
    insertImage: actionCommand("insertImage", (): void =>
      document.insertImage(),
    ),
    insertShape: actionCommand("insertShape", (p): void =>
      document.insertShape(String(p)),
    ),
    setShapeFill: actionCommand("setShapeFill", (p): void =>
      document.setShapeFill(p == null ? null : String(p)),
    ),
    setShapeOutline: actionCommand("setShapeOutline", (p): void =>
      document.setShapeOutline(p == null ? null : String(p)),
    ),
    setShapeOutlineWidth: actionCommand("setShapeOutlineWidth", (p): void =>
      document.setShapeOutlineWidth(Number(p)),
    ),
    alignFloatingObject: actionCommand("alignFloatingObject", (p): void =>
      document.alignFloatingObject(
        (p as "left" | "center" | "right") ?? "center",
      ),
    ),
    reorderFloatingObject: actionCommand("reorderFloatingObject", (p): void =>
      document.reorderFloatingObject((p as "front" | "back") ?? "front"),
    ),
    nudgeFloatingObject: actionCommand("nudgeFloatingObject", (p): void => {
      const px = (p ?? {}) as { dx?: number; dy?: number };
      document.nudgeFloatingObject(Number(px.dx) || 0, Number(px.dy) || 0);
    }),
    setFloatingFixedPosition: actionCommand(
      "setFloatingFixedPosition",
      (p): void => document.setFloatingFixedPosition(Boolean(p)),
    ),
    setFloatingRotation: actionCommand("setFloatingRotation", (p): void =>
      document.setFloatingRotation(Number(p)),
    ),
    setFloatingWrapPreset: actionCommand("setFloatingWrapPreset", (p): void =>
      document.setFloatingWrapPreset(
        (p as
          | "inline"
          | "square"
          | "tight"
          | "through"
          | "topAndBottom"
          | "behind"
          | "front") ?? "square",
      ),
    ),
    setFloatingWrapText: actionCommand("setFloatingWrapText", (p): void =>
      document.setFloatingWrapText(
        (p as "bothSides" | "left" | "right" | "largest") ?? "bothSides",
      ),
    ),
    setFloatingPositionPreset: actionCommand(
      "setFloatingPositionPreset",
      (p): void =>
        document.setFloatingPositionPreset(
          (p as
            | "topLeft"
            | "topCenter"
            | "topRight"
            | "middleLeft"
            | "middleCenter"
            | "middleRight"
            | "bottomLeft"
            | "bottomCenter"
            | "bottomRight") ?? "middleCenter",
        ),
    ),
    setShapePreset: actionCommand("setShapePreset", (p): void =>
      document.setShapePreset(p == null ? "rect" : String(p)),
    ),
    setTextBoxTextDirection: actionCommand(
      "setTextBoxTextDirection",
      (p): void =>
        document.setTextBoxTextDirection(
          (p as "horz" | "vert" | "vert270" | "wordArtVert") ?? "horz",
        ),
    ),
    setTextBoxVerticalAlign: actionCommand(
      "setTextBoxVerticalAlign",
      (p): void =>
        document.setTextBoxVerticalAlign((p as "t" | "ctr" | "b") ?? "t"),
    ),
    editTextBoxAlt: actionCommand("editTextBoxAlt", (p): void =>
      document.setTextBoxAlt(p == null ? null : String(p)),
    ),
    rotateTextBox: actionCommand("rotateTextBox", (p): void =>
      document.rotateTextBox((p as "left" | "right") ?? "left"),
    ),
    textBoxWidthCm: actionCommand(
      "textBoxWidthCm",
      (p): void => document.setTextBoxWidthCm(Number(p)),
      (): { isEnabled: boolean; value: number | null } => ({
        isEnabled: document.isTextBoxSelected(),
        value: document.getTextBoxSizeCm()?.width ?? null,
      }),
    ),
    textBoxHeightCm: actionCommand(
      "textBoxHeightCm",
      (p): void => document.setTextBoxHeightCm(Number(p)),
      (): { isEnabled: boolean; value: number | null } => ({
        isEnabled: document.isTextBoxSelected(),
        value: document.getTextBoxSizeCm()?.height ?? null,
      }),
    ),
    openSymbolDialog: actionCommand("openSymbolDialog", (): void =>
      document.openSymbolDialog(),
    ),
    openEquationDialog: actionCommand("openEquationDialog", (): void =>
      document.openEquationDialog(),
    ),
    tableProperties: actionCommand(
      "tableProperties",
      (p): void =>
        document.openTableProperties(
          (p as { activeTab?: "table" | "cell" } | undefined)?.activeTab ??
            "table",
        ),
      (): { isEnabled: boolean } => ({ isEnabled: document.hasActiveTable() }),
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
        isEnabled: canEditImage("editImageAlt"),
        isActive: image.isSelected(),
      }),
    ),
    insertImageCaption: actionCommand(
      "insertImageCaption",
      (): void => image.promptCaption(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: canEditImage("insertImageCaption"),
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
        isEnabled: canEditImage("imageWidthCm"),
        value: image.getSizeCm()?.width ?? null,
      }),
    ),
    imageHeightCm: actionCommand(
      "imageHeightCm",
      (p): void => image.setHeightCm(Number(p)),
      (): { isEnabled: boolean; value: number | null } => ({
        isEnabled: canEditImage("imageHeightCm"),
        value: image.getSizeCm()?.height ?? null,
      }),
    ),
    imageCrop: actionCommand(
      "imageCrop",
      (): void => image.toggleCrop(),
      (): { isEnabled: boolean; isActive: boolean } => ({
        isEnabled: canEditImage("imageCrop"),
        isActive: image.isCropActive(),
      }),
    ),
    imageCropAspect: actionCommand(
      "imageCropAspect",
      (p): void => image.applyCropAspect(String(p)),
      (): { isEnabled: boolean } => ({
        isEnabled: canEditImage("imageCropAspect"),
      }),
    ),
    imageCropShape: actionCommand(
      "imageCropShape",
      (p): void => image.applyCropShape(String(p)),
      (): { isEnabled: boolean; value: string | null } => ({
        isEnabled: canEditImage("imageCropShape"),
        value: image.getCropShape(),
      }),
    ),
    imageCropFill: actionCommand(
      "imageCropFill",
      (): void => image.applyCropFill(),
      (): { isEnabled: boolean } => ({
        isEnabled: canEditImage("imageCropFill"),
      }),
    ),
    imageCropFit: actionCommand(
      "imageCropFit",
      (): void => image.applyCropFit(),
      (): { isEnabled: boolean } => ({
        isEnabled: canEditImage("imageCropFit"),
      }),
    ),
    imageCropReset: actionCommand(
      "imageCropReset",
      (): void => image.resetCrop(),
      (): { isEnabled: boolean } => ({
        isEnabled: canEditImage("imageCropReset"),
      }),
    ),
    imageFlip: actionCommand(
      "imageFlip",
      (p): void => image.flip((p as "horizontal" | "vertical") ?? "horizontal"),
      (): { isEnabled: boolean } => ({
        isEnabled: canEditImage("imageFlip"),
      }),
    ),
    imageRotate: actionCommand(
      "imageRotate",
      (p): void => image.rotate((p as "left" | "right") ?? "left"),
      (): { isEnabled: boolean } => ({
        isEnabled: canEditImage("imageRotate"),
      }),
    ),
    imageBorder: actionCommand(
      "imageBorder",
      (p): void => image.setBorder(p as ImageBorderPatch),
      (): { isEnabled: boolean; value: EditorImageBorder | null } => ({
        isEnabled: canEditImage("imageBorder"),
        value: image.getBorder(),
      }),
    ),
    imageTransparency: actionCommand(
      "imageTransparency",
      (p): void =>
        image.setTransparency(
          typeof p === "number" ? p : p == null ? 0 : Number(p),
        ),
      (): { isEnabled: boolean; value: number | null } => ({
        isEnabled: canEditImage("imageTransparency"),
        value: image.getTransparency(),
      }),
    ),
    resetImage: actionCommand(
      "resetImage",
      (): void => image.reset(),
      (): { isEnabled: boolean } => ({
        isEnabled: gate.isCommandEnabled("resetImage") && image.canReset(),
      }),
    ),
  };
}
