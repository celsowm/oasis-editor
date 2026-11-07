import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorTableNode,
} from "@/core/model.js";
import { getDocumentSectionsCanonical } from "@/core/model.js";
import { escapeHtml } from "@/core/html/htmlEscape.js";
import { paragraphStyleToCssText } from "@/core/html/styleCss.js";
import { serializeParagraphRunsToHtml } from "@/core/html/htmlTextSerializer.js";

export interface HtmlExportOptions {
  /** HTML fragment for embedding (default), or a standalone HTML document. */
  fullDocument?: boolean;
}

function styleAttribute(paragraph: EditorParagraphNode): string {
  const css = paragraphStyleToCssText(paragraph.style);
  return css ? ' style="' + escapeHtml(css) + '"' : "";
}

function paragraphTag(paragraph: EditorParagraphNode): string {
  const heading = /^heading([1-6])$/.exec(paragraph.style?.styleId ?? "");
  return heading ? "h" + heading[1] : "p";
}

function renderTable(table: EditorTableNode, document: EditorDocument): string {
  const rows = table.rows.map((row): string => {
    const cells = row.cells.map((cell): string => {
      const tag = row.isHeader || row.style?.isHeader ? "th" : "td";
      const colspan = (cell.colSpan ?? 1) > 1
        ? ' colspan="' + String(cell.colSpan) + '"' : "";
      const rowspan = (cell.rowSpan ?? 1) > 1
        ? ' rowspan="' + String(cell.rowSpan) + '"' : "";
      return "<" + tag + colspan + rowspan + ">" +
        renderBlocks(cell.blocks, document) + "</" + tag + ">";
    }).join("");
    return "<tr>" + cells + "</tr>";
  }).join("");
  return "<table><tbody>" + rows + "</tbody></table>";
}

/**
 * Exports the semantic document body to HTML, preserving rich text, paragraphs,
 * headings, lists, table structure, cell spans, images, and inline styles.
 *
 * HTML is an interchange format: OOXML-only features (sections, revisions,
 * comments, floating objects, headers/footers) require DOCX or the native model.
 */
function renderBlocks(blocks: EditorBlockNode[], document: EditorDocument): string {
  let html = "";
  const listTags: string[] = [];
  const openItems: boolean[] = [];

  const closeOne = (): void => {
    const last = listTags.length - 1;
    if (last < 0) return;
    if (openItems[last]) html += "</li>";
    html += "</" + listTags[last] + ">";
    listTags.pop();
    openItems.pop();
  };
  const closeLists = (): void => {
    while (listTags.length) closeOne();
  };

  for (const block of blocks) {
    if (block.type === "table") {
      closeLists();
      html += renderTable(block, document);
      continue;
    }

    const content = serializeParagraphRunsToHtml(block.runs, document);
    const attrs = styleAttribute(block);
    if (!block.list) {
      closeLists();
      const tag = paragraphTag(block);
      html += "<" + tag + attrs + ">" + content + "</" + tag + ">";
      continue;
    }

    const tag = block.list.kind === "bullet" ? "ul" : "ol";
    const targetLevel = Math.max(0, Math.min(16, block.list.level ?? 0));

    while (listTags.length - 1 > targetLevel) closeOne();
    if (listTags.length - 1 === targetLevel &&
        listTags[listTags.length - 1] !== tag) closeOne();

    if (listTags.length - 1 === targetLevel && openItems[targetLevel]) {
      html += "</li>";
      openItems[targetLevel] = false;
    }

    while (listTags.length - 1 < targetLevel) {
      const parent = listTags.length - 1;
      if (parent >= 0 && !openItems[parent]) {
        html += "<li>";
        openItems[parent] = true;
      }
      html += "<" + tag + ">";
      listTags.push(tag);
      openItems.push(false);
    }

    html += "<li" + attrs + ">" + content;
    openItems[listTags.length - 1] = true;
  }
  closeLists();
  return html;
}

/** Serialize a document as an HTML fragment by default. */
export function exportEditorDocumentToHtml(
  document: EditorDocument,
  options: HtmlExportOptions = {},
): string {
  const body = getDocumentSectionsCanonical(document)
    .map((section): string => renderBlocks(section.blocks, document))
    .join("");
  if (!options.fullDocument) return body;

  const title = escapeHtml(String(document.metadata?.title ?? ""));
  return "<!doctype html><html lang=\"pt-BR\"><head><meta charset=\"utf-8\">" +
    "<title>" + title + "</title></head><body>" + body + "</body></html>";
}
