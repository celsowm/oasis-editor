import { createEssentialsPlugin } from "@/plugins/internal/createEssentialsPlugin.js";
import type { OasisPlugin } from "@/core/plugin.js";
import type { CreateEditorEssentialsPluginOptions } from "./essentials/types.js";
import { buildEssentialsGate } from "./essentials/gate.js";
import { buildEssentialsStyle } from "./essentials/style.js";
import { buildEssentialsSelection } from "./essentials/selection.js";
import { buildEssentialsHistory } from "./essentials/history.js";
import { buildEssentialsFormatting } from "./essentials/formatting.js";
import { buildEssentialsDocument } from "./essentials/document.js";
import { buildEssentialsLink } from "./essentials/link.js";
import { buildEssentialsImage } from "./essentials/image.js";
import { buildEssentialsBrowser } from "./essentials/browser.js";
import { buildEssentialsParagraph } from "./essentials/paragraph.js";
import { buildEssentialsSection } from "./essentials/section.js";
import { buildEssentialsHeaderFooter } from "./essentials/headerFooter.js";
import { buildEssentialsBookmark } from "./essentials/bookmark.js";
import { buildEssentialsFields } from "./essentials/fields.js";
import { buildEssentialsTable } from "./essentials/table.js";
import { buildEssentialsDesign } from "./essentials/design.js";

export type { CreateEditorEssentialsPluginOptions };

export function createEditorEssentialsRuntimePlugin(
  options: CreateEditorEssentialsPluginOptions,
): OasisPlugin {
  return createEssentialsPlugin({
    gate: buildEssentialsGate(options),
    style: buildEssentialsStyle(options),
    selection: buildEssentialsSelection(options),
    history: buildEssentialsHistory(options),
    formatting: buildEssentialsFormatting(options),
    document: buildEssentialsDocument(options),
    link: buildEssentialsLink(options),
    image: buildEssentialsImage(options),
    browser: buildEssentialsBrowser(options),
    paragraph: buildEssentialsParagraph(options),
    section: buildEssentialsSection(options),
    headerFooter: buildEssentialsHeaderFooter(options),
    table: buildEssentialsTable(options),
    design: buildEssentialsDesign(options),
    bookmark: buildEssentialsBookmark(options),
    fields: buildEssentialsFields(options),
  });
}
