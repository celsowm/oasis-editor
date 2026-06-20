import type { OasisPlugin } from "@/core/plugin.js";
import {
  createActionCommandBuilder,
  createCommandBuilder,
  createValueCommandBuilder,
} from "./essentialsCommandBuilders.js";
import {
  buildCoreFormattingCommands,
  buildDocumentAndBrowserCommands,
  buildParagraphAndSectionCommands,
  buildTableCommands,
} from "./essentialsCommandGroups.js";
import type { EssentialsPluginDeps } from "./essentialsCapabilities.js";

export type {
  EssentialsFeatureGate,
  EssentialsStyleCapability,
  EssentialsSelectionCapability,
  EssentialsHistoryCapability,
  EssentialsFormattingCapability,
  EssentialsDocumentStyleDescriptor,
  EssentialsDocumentCapability,
  EssentialsLinkCapability,
  EssentialsImageCapability,
  EssentialsBrowserCapability,
  EssentialsParagraphCapability,
  EssentialsSectionCapability,
  EssentialsTableCapability,
  EssentialsPluginDeps,
} from "./essentialsCapabilities.js";

export function createEssentialsPlugin(
  deps: EssentialsPluginDeps,
): OasisPlugin {
  const command = createCommandBuilder(deps.gate.isCommandEnabled);
  const valueCommand = createValueCommandBuilder(deps.gate.isCommandEnabled);
  const actionCommand = createActionCommandBuilder(deps.gate.isCommandEnabled);

  return {
    name: "Essentials",
    commands: {
      ...buildCoreFormattingCommands({
        gate: deps.gate,
        style: deps.style,
        selection: deps.selection,
        history: deps.history,
        formatting: deps.formatting,
        link: deps.link,
        command,
        valueCommand,
        actionCommand,
      }),
      ...buildDocumentAndBrowserCommands({
        gate: deps.gate,
        style: deps.style,
        document: deps.document,
        link: deps.link,
        image: deps.image,
        browser: deps.browser,
        actionCommand,
      }),
      ...buildParagraphAndSectionCommands({
        style: deps.style,
        paragraph: deps.paragraph,
        section: deps.section,
        valueCommand,
        actionCommand,
      }),
      ...buildTableCommands({
        gate: deps.gate,
        table: deps.table,
        actionCommand,
      }),
    },
  };
}
