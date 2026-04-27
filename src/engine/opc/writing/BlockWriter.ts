import { XMLBuilder } from "../XMLBuilder.js";
import { Relationship } from "../OPCGraphBuilder.js";
import {
  BlockNode,
  ParagraphNode,
  HeadingNode,
  ListItemNode,
  OrderedListItemNode,
  ImageNode,
  TableNode,
  TableRowNode,
  TableCellNode,
  PageBreakNode,
  EquationNode,
} from "../../../core/document/BlockTypes.js";
import { RunWriter } from "./RunWriter.js";
import { W_NS, WP_NS, A_NS, PIC_NS, nextRelId, getRelIdCounter, pxToEmu, pxToTwip, parseDataUri } from "./WmlConstants.js";

export class BlockWriter {
  private runWriter: RunWriter;

  constructor(runWriter: RunWriter) {
    this.runWriter = runWriter;
  }

  writeBlock(
    b: XMLBuilder,
    block: BlockNode,
    rels: Relationship[],
    imageParts: Map<string, { contentType: string; data: Uint8Array }>,
  ): void {
    switch (block.kind) {
      case "paragraph":
        this.writeParagraph(b, block);
        break;
      case "heading":
        this.writeHeading(b, block);
        break;
      case "list-item":
        this.writeListItem(b, block, "bullet");
        break;
      case "ordered-list-item":
        this.writeListItem(b, block, block.listFormat ?? "decimal");
        break;
      case "table":
        this.writeTable(b, block);
        break;
      case "image":
        this.writeImageParagraph(b, block, rels, imageParts);
        break;
      case "page-break":
        this.writePageBreakParagraph(b);
        break;
      case "equation":
        this.writeEquation(b, block);
        break;
      case "chart":
        this.writeChartPlaceholder(b, block);
        break;
    }
  }

  private writeParagraph(b: XMLBuilder, p: ParagraphNode): void {
    b.open(W_NS, "p");
    this.writeParagraphProperties(b, p.align, p.indentation, p.styleId);
    this.runWriter.writeRuns(b, p.children);
    b.close(W_NS, "p");
  }

  private writeHeading(b: XMLBuilder, h: HeadingNode): void {
    b.open(W_NS, "p");
    b.open(W_NS, "pPr");
    b.selfClose(W_NS, "pStyle", { "w:val": h.styleId ?? `Heading${h.level}` });
    if (h.align && h.align !== "left") {
      b.selfClose(W_NS, "jc", { "w:val": h.align });
    }
    if (h.indentation && h.indentation > 0) {
      b.open(W_NS, "ind");
      b.selfClose(W_NS, "left", { "w:val": pxToTwip(h.indentation) });
      b.close(W_NS, "ind");
    }
    b.close(W_NS, "pPr");
    this.runWriter.writeRuns(b, h.children);
    b.close(W_NS, "p");
  }

  private writeListItem(
    b: XMLBuilder,
    item: ListItemNode | OrderedListItemNode,
    format: string,
  ): void {
    b.open(W_NS, "p");
    b.open(W_NS, "pPr");

    if (item.styleId) {
      b.selfClose(W_NS, "pStyle", { "w:val": item.styleId });
    }

    // Numbering properties
    const isOrdered = item.kind === "ordered-list-item";
    const numId = isOrdered ? "2" : "1"; // 1 = bullet, 2 = decimal (matching numbering.xml)
    const ilvl = item.level ?? 0;

    b.open(W_NS, "numPr");
    b.selfClose(W_NS, "ilvl", { "w:val": ilvl });
    b.selfClose(W_NS, "numId", { "w:val": numId });
    b.close(W_NS, "numPr");

    if (item.align && item.align !== "left") {
      b.selfClose(W_NS, "jc", { "w:val": item.align });
    }
    if (item.indentation && item.indentation > 0) {
      b.open(W_NS, "ind");
      b.selfClose(W_NS, "left", { "w:val": pxToTwip(item.indentation) });
      b.close(W_NS, "ind");
    }
    b.close(W_NS, "pPr");

    this.runWriter.writeRuns(b, item.children);
    b.close(W_NS, "p");
  }

  writeParagraphLike(b: XMLBuilder, block: ParagraphNode | HeadingNode | ListItemNode | OrderedListItemNode): void {
    b.open(W_NS, "p");
    this.writeParagraphProperties(b, (block as any).align, (block as any).indentation, (block as any).styleId);
    this.runWriter.writeRuns(b, block.children);
    b.close(W_NS, "p");
  }

  private writeParagraphProperties(
    b: XMLBuilder,
    align: string,
    indentation?: number,
    styleId?: string,
  ): void {
    b.open(W_NS, "pPr");
    if (styleId) {
      b.selfClose(W_NS, "pStyle", { "w:val": styleId });
    }
    if (align && align !== "left") {
      b.selfClose(W_NS, "jc", { "w:val": align });
    }
    if (indentation && indentation > 0) {
      b.open(W_NS, "ind");
      b.selfClose(W_NS, "left", { "w:val": pxToTwip(indentation) });
      b.close(W_NS, "ind");
    }
    b.close(W_NS, "pPr");
  }

  private writePageBreakParagraph(b: XMLBuilder): void {
    b.open(W_NS, "p");
    b.open(W_NS, "pPr");
    b.selfClose(W_NS, "pageBreakBefore");
    b.close(W_NS, "pPr");
    b.open(W_NS, "r");
    b.open(W_NS, "t");
    b.text("");
    b.close(W_NS, "t");
    b.close(W_NS, "r");
    b.close(W_NS, "p");
  }

  private writeEquation(b: XMLBuilder, eq: EquationNode): void {
    b.open(W_NS, "p");
    if (eq.display) {
      b.open(W_NS, "pPr");
      b.selfClose(W_NS, "jc", { "w:val": "center" });
      b.close(W_NS, "pPr");
    }
    
    if (eq.omml) {
      let omml = eq.omml;
      if (eq.display && !omml.trim().startsWith("<m:oMathPara")) {
        omml = `<m:oMathPara>${omml}</m:oMathPara>`;
      }
      b.raw(omml);
    } else if (eq.latex) {
      b.open(W_NS, "r");
      b.open(W_NS, "t");
      b.text(eq.latex);
      b.close(W_NS, "t");
      b.close(W_NS, "r");
    }
    
    b.close(W_NS, "p");
  }

  private writeChartPlaceholder(b: XMLBuilder, chart: import("../../../core/document/BlockTypes.js").ChartNode): void {
    b.open(W_NS, "p");
    b.open(W_NS, "pPr");
    b.selfClose(W_NS, "jc", { "w:val": "center" });
    b.close(W_NS, "pPr");
    b.open(W_NS, "r");
    b.open(W_NS, "rPr");
    b.selfClose(W_NS, "color", { "w:val": "9CA3AF" });
    b.close(W_NS, "rPr");
    b.open(W_NS, "t");
    b.text(`[${chart.chartType} chart${chart.title ? ": " + chart.title : ""}]`);
    b.close(W_NS, "t");
    b.close(W_NS, "r");
    b.close(W_NS, "p");
  }

  private writeTable(b: XMLBuilder, table: TableNode): void {
    b.open(W_NS, "tbl");

    // Table properties
    b.open(W_NS, "tblPr");
    b.open(W_NS, "tblW", { "w:type": "auto" });
    b.close(W_NS, "tblW");
    b.close(W_NS, "tblPr");

    // Grid columns
    b.open(W_NS, "tblGrid");
    for (let i = 0; i < table.columnWidths.length; i++) {
      const w = table.columnWidths[i] ?? 100;
      b.selfClose(W_NS, "gridCol", { "w:w": pxToTwip(w) });
    }
    b.close(W_NS, "tblGrid");

    for (const row of table.rows) {
      this.writeTableRow(b, row);
    }

    b.close(W_NS, "tbl");
  }

  private writeTableRow(b: XMLBuilder, row: TableRowNode): void {
    b.open(W_NS, "tr");
    for (const cell of row.cells) {
      this.writeTableCell(b, cell);
    }
    b.close(W_NS, "tr");
  }

  private writeTableCell(b: XMLBuilder, cell: TableCellNode): void {
    b.open(W_NS, "tc");
    b.open(W_NS, "tcPr");

    if (cell.colSpan && cell.colSpan > 1) {
      b.selfClose(W_NS, "gridSpan", { "w:val": cell.colSpan });
    }
    if (cell.rowSpan === 0) {
      b.selfClose(W_NS, "vMerge");
    } else if (cell.rowSpan && cell.rowSpan > 1) {
      b.selfClose(W_NS, "vMerge", { "w:val": "restart" });
    }
    if (cell.vAlign) {
      const vaMap: Record<string, string> = { top: "top", middle: "center", bottom: "bottom" };
      b.selfClose(W_NS, "vAlign", { "w:val": vaMap[cell.vAlign] ?? "top" });
    }
    if (cell.shading) {
      b.selfClose(W_NS, "shd", { "w:val": "clear", "w:fill": cell.shading, "w:color": "auto" });
    }

    b.close(W_NS, "tcPr");

    if (cell.children.length === 0) {
      b.open(W_NS, "p");
      b.open(W_NS, "r");
      b.open(W_NS, "t");
      b.text("");
      b.close(W_NS, "t");
      b.close(W_NS, "r");
      b.close(W_NS, "p");
    } else {
      for (const block of cell.children) {
        this.writeBlock(b, block, [], new Map());
      }
    }

    b.close(W_NS, "tc");
  }

  private writeImageParagraph(
    b: XMLBuilder,
    image: ImageNode,
    rels: Relationship[],
    imageParts: Map<string, { contentType: string; data: Uint8Array }>,
  ): void {
    const parsed = parseDataUri(image.src);
    if (!parsed) {
      b.open(W_NS, "p");
      b.open(W_NS, "pPr");
      b.selfClose(W_NS, "jc", { "w:val": image.align });
      b.close(W_NS, "pPr");
      b.open(W_NS, "r");
      b.open(W_NS, "t");
      b.text(`[Image: ${image.alt || "unknown"}]`);
      b.close(W_NS, "t");
      b.close(W_NS, "r");
      b.close(W_NS, "p");
      return;
    }

    const relId = nextRelId();
    const imageName = `media/image${getRelIdCounter() - 1}.${parsed.ext}`;
    rels.push({
      id: relId,
      type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image",
      target: imageName,
    });
    imageParts.set(imageName, { contentType: parsed.mime, data: parsed.data });

    const cx = pxToEmu(image.width);
    const cy = pxToEmu(image.height);

    b.open(W_NS, "p");
    b.open(W_NS, "pPr");
    b.selfClose(W_NS, "jc", { "w:val": image.align });
    b.close(W_NS, "pPr");
    b.open(W_NS, "r");
    b.open(W_NS, "drawing");
    b.open(WP_NS, "inline", { distT: 0, distB: 0, distL: 0, distR: 0 });
    b.open(WP_NS, "extent", { cx, cy });
    b.close(WP_NS, "extent");
    b.open(WP_NS, "effectExtent", { l: 0, t: 0, r: 0, b: 0 });
    b.close(WP_NS, "effectExtent");
    b.open(WP_NS, "docPr", { id: getRelIdCounter() - 1, name: `Picture ${getRelIdCounter() - 1}`, descr: image.alt || "" });
    b.close(WP_NS, "docPr");
    b.open(WP_NS, "cNvGraphicFramePr");
    b.selfClose(A_NS, "graphicFrameLocks", { noChangeAspect: true });
    b.close(WP_NS, "cNvGraphicFramePr");
    b.open(A_NS, "graphic");
    b.open(A_NS, "graphicData", { uri: "http://schemas.openxmlformats.org/drawingml/2006/picture" });
    b.open(PIC_NS, "pic");
    b.open(PIC_NS, "nvPicPr");
    b.selfClose(PIC_NS, "cNvPr", { id: 0, name: "Picture 1" });
    b.selfClose(PIC_NS, "cNvPicPr");
    b.close(PIC_NS, "nvPicPr");
    b.open(PIC_NS, "blipFill");
    b.open(A_NS, "blip", { "r:embed": relId });
    b.close(A_NS, "blip");
    b.open(A_NS, "stretch");
    b.selfClose(A_NS, "fillRect");
    b.close(A_NS, "stretch");
    b.close(PIC_NS, "blipFill");
    b.open(PIC_NS, "spPr");
    b.open(A_NS, "xfrm");
    b.open(A_NS, "off", { x: 0, y: 0 });
    b.close(A_NS, "off");
    b.open(A_NS, "ext", { cx, cy });
    b.close(A_NS, "ext");
    b.close(A_NS, "xfrm");
    b.open(A_NS, "prstGeom", { prst: "rect" });
    b.selfClose(A_NS, "avLst");
    b.close(A_NS, "prstGeom");
    b.close(PIC_NS, "spPr");
    b.close(PIC_NS, "pic");
    b.close(A_NS, "graphicData");
    b.close(A_NS, "graphic");
    b.close(WP_NS, "inline");
    b.close(W_NS, "drawing");
    b.close(W_NS, "r");
    b.close(W_NS, "p");
  }
}
