import type { OasisPlugin } from "@/core/plugin.js";
import {
  createActionCommandBuilder,
  createCommandBuilder,
  createValueCommandBuilder,
} from "./essentialsCommandBuilders.js";
import { buildCoreFormattingCommands } from "./essentialsCommandGroups/coreFormatting.js";
import { buildDocumentAndBrowserCommands } from "./essentialsCommandGroups/documentAndBrowser.js";
import { buildParagraphAndSectionCommands } from "./essentialsCommandGroups/paragraphAndSection.js";
import { buildHeaderFooterCommands } from "./essentialsCommandGroups/headerFooter.js";
import { buildBookmarkCommands } from "./essentialsCommandGroups/bookmark.js";
import { buildTableCommands } from "./essentialsCommandGroups/table.js";
import { buildDesignCommands } from "./essentialsCommandGroups/design.js";
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
  EssentialsHeaderFooterCapability,
  EssentialsTableCapability,
  EssentialsPluginDeps,
  EssentialsDesignCapability,
  EssentialsBookmarkCapability,
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
      ...buildHeaderFooterCommands({
        gate: deps.gate,
        headerFooter: deps.headerFooter,
        command,
        actionCommand,
      }),
      ...buildTableCommands({
        gate: deps.gate,
        table: deps.table,
        actionCommand,
      }),
      ...buildDesignCommands({
        design: deps.design,
        actionCommand,
      }),
      ...buildBookmarkCommands({
        bookmark: deps.bookmark,
        actionCommand,
      }),
    },
  };
}
