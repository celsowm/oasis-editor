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

/** Convert Oasis pixels (96 DPI) to PDF points (72 DPI). */
function pxToPt(px: number): number {
  return px * 0.75;
}

export class PdfExporter implements DocumentExporter {
  async exportToBlob(document: DocumentModel): Promise<Blob> {
    const docDef = this.buildDocDefinition(document);
    // @ts-ignore
    const pdfDocGenerator = pdfMake.createPdf(docDef);
    return pdfDocGenerator.getBlob();
  }

  async exportToBuffer(document: DocumentModel): Promise<ArrayBuffer> {
    const blob = await this.exportToBlob(document);
    return blob.arrayBuffer();
  }

  private buildDocDefinition(document: DocumentModel): TDocumentDefinitions {
    const section = document.sections[0]; // pdfmake supports one section config per doc

    const margins: [number, number, number, number] = [
      pxToPt(section.margins.left),
      pxToPt(section.margins.top),
      pxToPt(section.margins.right),
      pxToPt(section.margins.bottom),
    ];

    const content = this.convertBlocks(section.children);

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

  /**
   * Convert a list of blocks, grouping consecutive list items into single
   * `ul`/`ol` elements as required by pdfmake.
   */
  private convertBlocks(blocks: BlockNode[]): Content[] {
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
        result.push(...this.convertBlock(block));
      }
    }

    flushList();
    return result;
  }

  private convertBlock(block: BlockNode): Content[] {
    if (isTextBlock(block)) {
      return [this.convertTextBlock(block)];
    }

    if (isTableNode(block)) {
      return [this.convertTable(block)];
    }

    if (block.kind === "image") {
      return [this.convertImage(block)];
    }

    return [];
  }

  private convertTextBlock(
    block: ParagraphNode | HeadingNode | ListItemNode | OrderedListItemNode,
  ): Content {
    const textRuns = block.children.map((run) => this.convertTextRun(run));

    const node: ContentText = {
      text: textRuns,
      alignment: ALIGN_MAP[block.align] ?? "left",
    };

    if (block.indentation !== undefined && block.indentation > 0) {
      // pdfmake does not have a direct "indent" on text nodes, but we can use marginLeft
      (node as { margin?: [number, number, number, number] }).margin = [
        pxToPt(block.indentation),
        0,
        0,
        0,
      ];
    }

    if (block.kind === "heading") {
      // Apply heading styles via fontSize and bold
      const headingSizes: Record<number, number> = {
        1: 24,
        2: 20,
        3: 18,
        4: 16,
        5: 14,
        6: 12,
      };
      node.fontSize = headingSizes[block.level] ?? 12;
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
    };
  }

  private convertTextRun(run: OasisTextRun): ContentText {
    const node: ContentText = {
      text: run.text,
      bold: run.marks.bold,
      italics: run.marks.italic,
      color: run.marks.color,
      fontSize: run.marks.fontSize,
    };

    if (run.marks.underline) {
      node.decoration = "underline";
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
