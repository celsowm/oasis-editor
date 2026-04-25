import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  Numbering,
  Header,
  Footer,
  PageOrientation,
  convertMillimetersToTwip,
  LevelFormat,
} from "docx";
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
  TableRowNode,
  TableCellNode,
} from "../../core/document/BlockTypes.js";

const ALIGN_MAP: Record<string, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.BOTH,
};

const HEADING_MAP: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
  4: HeadingLevel.HEADING_4,
  5: HeadingLevel.HEADING_5,
  6: HeadingLevel.HEADING_6,
};

function parseDataUri(dataUri: string): { mime: string; data: string } | null {
  const match = dataUri.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], data: match[2] };
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function getImageType(mime: string): "jpg" | "png" | "gif" | "bmp" | null {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/gif") return "gif";
  if (mime === "image/bmp") return "bmp";
  return null;
}

export class DocxExporter implements DocumentExporter {
  async exportToBlob(document: DocumentModel): Promise<Blob> {
    const doc = this.buildDocxDocument(document);
    return Packer.toBlob(doc);
  }

  async exportToBuffer(document: DocumentModel): Promise<ArrayBuffer> {
    const doc = this.buildDocxDocument(document);
    return Packer.toArrayBuffer(doc);
  }

  private buildDocxDocument(document: DocumentModel): Document {
    const sections = document.sections.map((section) => {
      const children: (Paragraph | Table)[] = [];

      for (const block of section.children) {
        const converted = this.convertBlock(block);
        children.push(...converted);
      }

      const sectionOptions: {
        headers?: { default?: Header };
        footers?: { default?: Footer };
        properties?: {
          page?: {
            size?: { width?: number; height?: number; orientation?: (typeof PageOrientation)[keyof typeof PageOrientation] };
            margin?: {
              top?: number;
              right?: number;
              bottom?: number;
              left?: number;
              header?: number;
              footer?: number;
            };
          };
        };
        children: (Paragraph | Table)[];
      } = { children };

      // Margins: Oasis uses pixels (96 DPI). Convert to twips (1 inch = 1440 twips = 96 px)
      const pxToTwip = (px: number) => Math.round((px / 96) * 1440);

      sectionOptions.properties = {
        page: {
          margin: {
            top: pxToTwip(section.margins.top),
            right: pxToTwip(section.margins.right),
            bottom: pxToTwip(section.margins.bottom),
            left: pxToTwip(section.margins.left),
            header: pxToTwip(section.margins.top * 0.5),
            footer: pxToTwip(section.margins.bottom * 0.5),
          },
        },
      };

      if (section.orientation === "landscape") {
        sectionOptions.properties.page!.size = {
          width: convertMillimetersToTwip(297),
          height: convertMillimetersToTwip(210),
          orientation: PageOrientation.LANDSCAPE,
        };
      } else {
        sectionOptions.properties.page!.size = {
          width: convertMillimetersToTwip(210),
          height: convertMillimetersToTwip(297),
          orientation: PageOrientation.PORTRAIT,
        };
      }

      // Header
      if (section.header && section.header.length > 0) {
        const headerChildren: (Paragraph | Table)[] = [];
        for (const block of section.header) {
          headerChildren.push(...this.convertBlock(block));
        }
        sectionOptions.headers = { default: new Header({ children: headerChildren }) };
      }

      // Footer
      if (section.footer && section.footer.length > 0) {
        const footerChildren: (Paragraph | Table)[] = [];
        for (const block of section.footer) {
          footerChildren.push(...this.convertBlock(block));
        }
        sectionOptions.footers = { default: new Footer({ children: footerChildren }) };
      }

      return sectionOptions;
    });

    return new Document({
      title: document.metadata.title,
      sections,
      numbering: {
        config: [
          {
            reference: "bullet-ref",
            levels: [
              {
                level: 0,
                format: LevelFormat.BULLET,
                text: "\u2022",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertMillimetersToTwip(10), hanging: convertMillimetersToTwip(5) },
                  },
                },
              },
            ],
          },
          {
            reference: "number-ref",
            levels: [
              {
                level: 0,
                format: LevelFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.LEFT,
                style: {
                  paragraph: {
                    indent: { left: convertMillimetersToTwip(10), hanging: convertMillimetersToTwip(5) },
                  },
                },
              },
            ],
          },
        ],
      },
    });
  }

  private convertBlock(block: BlockNode): (Paragraph | Table)[] {
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
  ): Paragraph {
    const children = block.children.map((run) => this.convertTextRun(run));

    const baseOptions = {
      children,
      alignment: ALIGN_MAP[block.align] ?? AlignmentType.LEFT,
    };

    let indent;
    if (block.indentation !== undefined && block.indentation > 0) {
      const twips = Math.round((block.indentation / 96) * 1440);
      indent = { left: twips };
    }

    if (block.kind === "heading") {
      return new Paragraph({ ...baseOptions, heading: HEADING_MAP[block.level], indent });
    } else if (block.kind === "list-item") {
      return new Paragraph({ ...baseOptions, numbering: { reference: "bullet-ref", level: 0 }, indent });
    } else if (block.kind === "ordered-list-item") {
      return new Paragraph({ ...baseOptions, numbering: { reference: "number-ref", level: 0 }, indent });
    }

    return new Paragraph({ ...baseOptions, indent });
  }

  private convertTextRun(run: OasisTextRun): TextRun {
    const options = {
      text: run.text,
      bold: run.marks.bold,
      italics: run.marks.italic,
      strike: run.marks.strike,
      color: run.marks.color,
      font: run.marks.fontFamily,
      underline: run.marks.underline ? { type: "single" as const } : undefined,
      size: run.marks.fontSize !== undefined ? run.marks.fontSize * 2 : undefined,
    };

    return new TextRun(options);
  }

  private convertImage(image: ImageNode): Paragraph {
    const parsed = parseDataUri(image.src);
    let imageRun: ImageRun;

    if (parsed) {
      const imgType = getImageType(parsed.mime);
      if (imgType) {
        imageRun = new ImageRun({
          type: imgType,
          data: base64ToArrayBuffer(parsed.data),
          transformation: {
            width: Math.round(image.width),
            height: Math.round(image.height),
          },
        });
      } else {
        // Fallback: treat as text placeholder
        return new Paragraph({
          text: `[Image: ${image.alt || "unknown"}]`,
          alignment: ALIGN_MAP[image.align] ?? AlignmentType.CENTER,
        });
      }
    } else {
      // If not a data URI, just put a placeholder
      return new Paragraph({
        text: `[Image: ${image.alt || "unknown"}]`,
        alignment: ALIGN_MAP[image.align] ?? AlignmentType.CENTER,
      });
    }

    return new Paragraph({
      children: [imageRun],
      alignment: ALIGN_MAP[image.align] ?? AlignmentType.CENTER,
    });
  }

  private convertTable(table: TableNode): Table {
    const rows = table.rows.map((row) => this.convertTableRow(row));

    return new Table({
      rows,
      columnWidths: table.columnWidths,
    });
  }

  private convertTableRow(row: TableRowNode): TableRow {
    const cells = row.cells.map((cell) => this.convertTableCell(cell));
    return new TableRow({ children: cells });
  }

  private convertTableCell(cell: TableCellNode): TableCell {
    const children: (Paragraph | Table)[] = [];
    for (const block of cell.children) {
      const converted = this.convertBlock(block);
      children.push(...converted);
    }
    if (children.length === 0) {
      children.push(new Paragraph({ text: "" }));
    }

    return new TableCell({ children });
  }
}
