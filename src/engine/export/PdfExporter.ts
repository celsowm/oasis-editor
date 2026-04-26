import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type {
  TDocumentDefinitions,
  Content,
  ContentText,
  ContentTable,
  TableCell,
  PredefinedPageSize,
} from "pdfmake/interfaces";
import { DocumentExporter } from "../../core/export/DocumentExporter.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { BLOCK_SPACING } from "../../core/pages/PageTemplateTypes.js";
import { pxToPt } from "../../core/utils/Units.js";
import { HEADING_SIZES_PX } from "../../core/composition/TypographyConfig.js";
import {
  BlockNode,
  isTextBlock,
  isTableNode,
  TextRun as OasisTextRun,
  ParagraphNode,
  HeadingNode,
  ListItemNode,
  OrderedListItemNode,
  ImageNode,
  TableNode,
  TableCellNode,
} from "../../core/document/BlockTypes.js";

// Bootstrap vfs fonts for browser usage
// @ts-expect-error pdfmake types do not expose vfs
pdfMake.vfs = pdfFonts;

const ALIGN_MAP: Record<string, "left" | "center" | "right" | "justify"> = {
  left: "left",
  center: "center",
  right: "right",
  justify: "justify",
};

const PAGE_SIZE_MAP: Record<string, PredefinedPageSize> = {
  "template:a4:default": "A4",
};

export class PdfExporter implements DocumentExporter {
  async exportToBlob(document: DocumentModel, layout?: LayoutState): Promise<Blob> {
    const docDef = this.buildDocDefinition(document, layout);
    // @ts-ignore
    const pdfDocGenerator = pdfMake.createPdf(docDef);
    return pdfDocGenerator.getBlob();
  }

  async exportToBuffer(document: DocumentModel, layout?: LayoutState): Promise<ArrayBuffer> {
    const blob = await this.exportToBlob(document, layout);
    return blob.arrayBuffer();
  }

  private buildDocDefinition(document: DocumentModel, layout?: LayoutState): TDocumentDefinitions {
    const section = document.sections[0]; // pdfmake supports one section config per doc

    const margins: [number, number, number, number] = [
      pxToPt(section.margins.left),
      pxToPt(section.margins.top),
      pxToPt(section.margins.right),
      pxToPt(section.margins.bottom),
    ];

    const pageBreakMap = this.buildPageBreakMap(layout);
    const content = this.convertBlocks(section.children, pageBreakMap);

    const docDef: TDocumentDefinitions = {
      info: { title: document.metadata.title || "Untitled" },
      pageSize: PAGE_SIZE_MAP[section.pageTemplateId] || "A4",
      pageOrientation: section.orientation,
      pageMargins: margins,
      content,
    };

    // Header
    if (section.header && section.header.length > 0) {
      docDef.header = this.convertBlocks(section.header);
    }

    // Footer
    if (section.footer && section.footer.length > 0) {
      docDef.footer = this.convertBlocks(section.footer);
    }

    return docDef;
  }

  private buildPageBreakMap(layout?: LayoutState): Set<string> {
    const pageBreakBlocks = new Set<string>();
    if (!layout || layout.pages.length <= 1) return pageBreakBlocks;

    for (let i = 1; i < layout.pages.length; i++) {
      const page = layout.pages[i];
      for (const frag of page.fragments) {
        pageBreakBlocks.add(frag.blockId);
      }
    }
    return pageBreakBlocks;
  }

  /**
   * Convert a list of blocks, grouping consecutive list items into single
   * `ul`/`ol` elements as required by pdfmake.
   */
  private convertBlocks(blocks: BlockNode[], pageBreakMap?: Set<string>): Content[] {
    const result: Content[] = [];

    type ListAccumulator = { kind: "ul" | "ol"; items: Content[] } | null;
    let currentList: ListAccumulator = null;

    const flushList = () => {
      if (!currentList) return;
      if (currentList.kind === "ul") {
        result.push({ ul: currentList.items });
      } else {
        result.push({ ol: currentList.items });
      }
      currentList = null;
    };

    for (const block of blocks) {
      if (block.kind === "list-item") {
        if (!currentList || currentList.kind !== "ul") {
          flushList();
          currentList = { kind: "ul", items: [] };
        }
        currentList.items.push(this.convertTextBlockToListItem(block));
      } else if (block.kind === "ordered-list-item") {
        if (!currentList || currentList.kind !== "ol") {
          flushList();
          currentList = { kind: "ol", items: [] };
        }
        currentList.items.push(this.convertTextBlockToListItem(block));
      } else {
        flushList();
        result.push(...this.convertBlock(block, pageBreakMap));
      }
    }

    flushList();
    return result;
  }

  private convertBlock(block: BlockNode, pageBreakMap?: Set<string>): Content[] {
    if (isTextBlock(block)) {
      return [this.convertTextBlock(block, pageBreakMap?.has(block.id))];
    }

    if (isTableNode(block)) {
      return [this.convertTable(block)];
    }

    if (block.kind === "image") {
      return [this.convertImage(block)];
    }

    if (block.kind === "equation") {
      return [this.convertEquation(block)];
    }

    if (block.kind === "chart") {
      return [this.convertChart(block)];
    }

    return [];
  }

  private convertChart(block: import("../../core/document/BlockTypes.js").ChartNode): Content {
    return {
      text: block.title || `[${block.chartType} chart]`,
      alignment: "center",
      color: "#6b7280",
      italics: true,
      fontSize: pxToPt(12),
      margin: [0, 0, 0, pxToPt(BLOCK_SPACING)],
    };
  }

  private convertEquation(block: import("../../core/document/BlockTypes.js").EquationNode): Content {
    return {
      text: block.latex || "[Equation]",
      alignment: block.display ? "center" : "left",
      italics: true,
      fontSize: pxToPt(14),
      margin: [0, 0, 0, pxToPt(BLOCK_SPACING)],
    };
  }

  private convertTextBlock(
    block: ParagraphNode | HeadingNode | ListItemNode | OrderedListItemNode,
    forcePageBreak: boolean = false,
  ): Content {
    const textRuns = block.children.map((run) => this.convertTextRun(run));

    const node: ContentText = {
      text: textRuns,
      alignment: ALIGN_MAP[block.align] ?? "left",
    };

    if (forcePageBreak) {
      (node as { pageBreak?: string }).pageBreak = "before";
    }

    if (block.indentation !== undefined && block.indentation > 0) {
      // pdfmake does not have a direct "indent" on text nodes, but we can use marginLeft
      (node as { margin?: [number, number, number, number] }).margin = [
        pxToPt(block.indentation),
        0,
        0,
        0,
      ];
    } else {
      (node as { margin?: [number, number, number, number] }).margin = [0, 0, 0, pxToPt(BLOCK_SPACING)];
    }

    if (block.kind === "heading") {
      // Heading defaults are in px; pdfmake expects pt.
      node.fontSize = pxToPt(HEADING_SIZES_PX[block.level] ?? HEADING_SIZES_PX[6]);
      node.bold = true;
    }

    return node;
  }

  private convertTextBlockToListItem(
    block: ListItemNode | OrderedListItemNode,
  ): Content {
    const textRuns = block.children.map((run) => this.convertTextRun(run));
    return {
      text: textRuns,
      margin: [0, 0, 0, pxToPt(BLOCK_SPACING)],
    };
  }

  private convertTextRun(run: OasisTextRun): ContentText {
    if (run.footnoteId) {
      return { text: run.footnoteId, sup: true, color: "#2563eb", fontSize: pxToPt(10) };
    }
    if (run.endnoteId) {
      return { text: run.endnoteId, sup: true, color: "#7c3aed", fontSize: pxToPt(10) };
    }

    const node: ContentText = {
      text: run.text,
      bold: run.marks.bold,
      italics: run.marks.italic,
      color: run.marks.color,
      fontSize: run.marks.fontSize !== undefined ? pxToPt(run.marks.fontSize) : undefined,
    };

    const decorations: ("underline" | "lineThrough")[] = [];
    if (run.marks.underline) decorations.push("underline");
    if (run.marks.strike) decorations.push("lineThrough");
    if (run.marks.link) {
      (node as { link?: string }).link = run.marks.link;
      node.color = run.marks.color || "#2563eb";
      if (!decorations.includes("underline")) decorations.push("underline");
    }
    if (decorations.length > 0) {
      node.decoration = decorations.length === 1 ? decorations[0] : decorations;
    }

    // pdfmake font property is called `font`
    if (run.marks.fontFamily) {
      (node as { font?: string }).font = run.marks.fontFamily;
    }

    return node;
  }

  private convertImage(image: ImageNode): Content {
    return {
      image: image.src,
      width: image.width,
      height: image.height,
      alignment: ALIGN_MAP[image.align] ?? "center",
      margin: [0, 0, 0, pxToPt(BLOCK_SPACING)],
    };
  }

  private convertTable(table: TableNode): ContentTable {
    const body = table.rows.map((row) =>
      row.cells.map((cell) => this.convertTableCell(cell)),
    );

    return {
      table: {
        body,
        widths: table.columnWidths.map((w) => w),
      },
      margin: [0, 0, 0, pxToPt(BLOCK_SPACING)],
    };
  }

  private convertTableCell(cell: TableCellNode): TableCell {
    const children = this.convertBlocks(cell.children);
    if (children.length === 0) {
      return { text: "" };
    }
    // If a single text node, return it directly (pdfmake allows Content in cells)
    if (children.length === 1) {
      return children[0] as TableCell;
    }
    // Multiple blocks: wrap in a stack
    return { stack: children };
  }
}
