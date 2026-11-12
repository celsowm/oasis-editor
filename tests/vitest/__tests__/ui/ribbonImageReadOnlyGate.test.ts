import { describe, expect, it } from "vitest";
import { buildDocumentAndBrowserCommands } from "@/plugins/internal/essentialsCommandGroups/documentAndBrowser.js";
import { createActionCommandBuilder } from "@/plugins/internal/essentialsCommandBuilders.js";
import { buildEssentialsGate } from "@/ui/app/essentials/gate.js";
import type { CreateEditorEssentialsPluginOptions } from "@/ui/app/essentials/types.js";
import type { OasisBuiltinCommand } from "@/core/commands/builtinCommands.js";
import type { CommandState, OasisCommand } from "@/core/plugin.js";

const IMAGE_COMMANDS: OasisBuiltinCommand[] = [
  "editImageAlt",
  "insertImageCaption",
  "imageWidthCm",
  "imageHeightCm",
  "imageCrop",
  "imageCropAspect",
  "imageCropShape",
  "imageCropFill",
  "imageCropFit",
  "imageCropReset",
  "imageFlip",
  "imageRotate",
  "imageBorder",
  "imageTransparency",
  "resetImage",
];

/** Image capability stub: an image is always selected and reset-able. */
const image = {
  isSelected: () => true,
  getSizeCm: () => ({ width: 1.27, height: 1.27 }),
  isCropActive: () => false,
  getCropShape: () => null,
  getBorder: () => null,
  getTransparency: () => 0,
  canReset: () => true,
};

function commandsFor(readOnly: boolean) {
  const gate = buildEssentialsGate({
    isReadOnly: () => readOnly,
  } as unknown as CreateEditorEssentialsPluginOptions);
  return buildDocumentAndBrowserCommands({
    gate,
    style: { state: () => ({}) },
    document: {},
    link: {},
    image,
    browser: {},
    actionCommand: createActionCommandBuilder(gate.isCommandEnabled),
  } as unknown as Parameters<typeof buildDocumentAndBrowserCommands>[0]);
}

const refresh = (command: OasisCommand | undefined): CommandState =>
  command?.refresh?.() as CommandState;

const enabled = (command: OasisCommand | undefined): boolean =>
  refresh(command).isEnabled;

describe("Picture Format read-only gate", () => {
  it("disables every image edit while the document is read-only", () => {
    const commands = commandsFor(true);
    for (const name of IMAGE_COMMANDS) {
      expect(
        enabled(commands[name] as OasisCommand | undefined),
        `${name} should be disabled in a read-only document`,
      ).toBe(false);
    }
  });

  it("keeps image edits enabled for an editable document", () => {
    const commands = commandsFor(false);
    for (const name of IMAGE_COMMANDS) {
      expect(
        enabled(commands[name] as OasisCommand | undefined),
        `${name} should stay enabled when editing is allowed`,
      ).toBe(true);
    }
  });

  it("keeps the context detector active so the tab still opens", () => {
    const commands = commandsFor(true);
    const context = commands.imageContext as OasisCommand | undefined;
    expect(refresh(context).isActive).toBe(true);
  });
});
