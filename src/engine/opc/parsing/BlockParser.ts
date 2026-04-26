import {
  BlockNode,
  TextRun,
  ImageNode,
  EquationNode,
  ChartNode,
  TableRowNode,
  TableCellNode,
} from "../../../core/document/BlockTypes.js";
import {
  createParagraph,
  createHeading,
  createPageBreak,
  createTable,
  createTableRow,
  createTableCell,
  createTextRun,
} from "../../../core/document/DocumentFactory.js";
import { genId } from "../../../core/utils/IdGenerator.js";
import { childElements, firstChild, getAttr } from "./XmlUtils.js";
import { ParseContext } from "./ParseContext.js";
import { RunParser } from "./RunParser.js";

let blockCounter = 2000;
const nextBlockId = (): string => `block:wml:${blockCounter++}`;

export class BlockParser {
  private runParser: RunParser;

  constructor(runParser: RunParser) {
    this.runParser = runParser;
  }

  parseBlockElement(el: Element, ctx: ParseContext): BlockNode[] {
    const tag = el.localName;

    switch (tag) {
      case "p":
        return this.parseParagraph(el, ctx);
      case "tbl":
        return this.parseTable(el, ctx);
      case "oMath":
      case "oMathPara": {
        const eq = this.runParser.parseRunContent(el, ctx, {})[0];
        return eq && "kind" in eq && eq.kind === "equation" ? [eq as EquationNode] : [];
      }
      case "sectPr":
        return [];
      case "AlternateContent":
        return this.parseAlternateContentBlocks(el, ctx);
      default:
        ctx.warnings.push({
          code: "UNKNOWN_BLOCK",
          message: `Unknown block element: ${tag}`,
          severity: "warning",
        });
        return [];
    }
  }

  private parseAlternateContentBlocks(el: Element, ctx: ParseContext): BlockNode[] {
    const fallback = firstChild(el, "Fallback");
    const choice = firstChild(el, "Choice");
    const target = fallback || choice;
    if (!target) return [];

    const blocks: BlockNode[] = [];
    for (const child of target.childNodes) {
      if (child.nodeType !== 1) continue;
      const parsed = this.parseBlockElement(child as Element, ctx);
      blocks.push(...parsed);
    }
    return blocks;
  }

  private parseParagraph(el: Element, ctx: ParseContext): BlockNode[] {
    const pPr = firstChild(el, "pPr");
    const pStyleEl = firstChild(pPr, "pStyle");
    const pStyle = getAttr(pStyleEl, "val");

    const rPrPb = firstChild(pPr, "pageBreakBefore");
    if (rPrPb || this.hasPageBreakRun(el)) {
      return [createPageBreak()];
    }

    const numPr = firstChild(pPr, "numPr");
    if (numPr) {
      return this.parseListItem(el, numPr, ctx);
    }

    const align = this.parseAlign(pPr);
    const items = this.runParser.parseRuns(el, ctx);

    if (pStyle) {
      const headingMatch = pStyle.match(/^Heading(\d)$/i);
      if (headingMatch) {
        const level = parseInt(headingMatch[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
        return this.splitMixedContent(items, (runs) => {
          const h = createHeading("", level);
          h.children = runs.length > 0 ? runs : [createTextRun("")];
          h.align = align as any;
          h.styleId = pStyle;
          return h;
        });
      }
    }

    return this.splitMixedContent(items, (runs) => {
      const p = createParagraph("");
      p.children = runs.length > 0 ? runs : [createTextRun("")];
      p.align = align as any;
      if (pStyle) p.styleId = pStyle;
      return p;
    });
  }

  private hasPageBreakRun(el: Element): boolean {
    for (const r of childElements(el, "r")) {
      const br = firstChild(r, "br");
      if (br && getAttr(br, "type") === "page") return true;
    }
    return false;
  }

  private parseListItem(el: Element, numPr: Element, ctx: ParseContext): BlockNode[] {
    const ilvl = parseInt(getAttr(firstChild(numPr, "ilvl"), "val") ?? "0", 10);
    const numId = getAttr(firstChild(numPr, "numId"), "val");
    const pPr = firstChild(el, "pPr");
    const pStyle = getAttr(firstChild(pPr, "pStyle"), "val");
    const align = this.parseAlign(pPr);
    const items = this.runParser.parseRuns(el, ctx);

    let listFormat: "decimal" | "bullet" | "lowerLetter" | "upperLetter" | "lowerRoman" | "upperRoman" = "decimal";

    if (numId && ctx.numbering) {
      const level = ctx.numbering.resolveLevel(numId, ilvl);
      if (level?.format) {
        listFormat = level.format;
      }
    }

    const isOrdered = listFormat !== "bullet";

    if (isOrdered) {
      return this.splitMixedContent(items, (runs) => ({
        id: nextBlockId(),
        kind: "ordered-list-item" as const,
        index: 1,
        level: ilvl,
        listFormat,
        align: align as any,
        styleId: pStyle ?? undefined,
        children: runs.length > 0 ? runs : [createTextRun("")],
      }));
    } else {
      return this.splitMixedContent(items, (runs) => ({
        id: nextBlockId(),
        kind: "list-item" as const,
        align: align as any,
        level: ilvl,
        listFormat: "bullet" as const,
        styleId: pStyle ?? undefined,
        children: runs.length > 0 ? runs : [createTextRun("")],
      }));
    }
  }

  private isBlockItem(item: TextRun | ImageNode | EquationNode | ChartNode): item is ImageNode | EquationNode | ChartNode {
    return "kind" in item && (item.kind === "image" || item.kind === "equation" || item.kind === "chart");
  }

  private splitMixedContent(
    items: (TextRun | ImageNode | EquationNode | ChartNode)[],
    createTextBlock: (runs: TextRun[]) => BlockNode,
  ): BlockNode[] {
    const blocks: BlockNode[] = [];
    let currentRuns: TextRun[] = [];

    for (const item of items) {
      if (this.isBlockItem(item)) {
        if (currentRuns.length > 0) {
          blocks.push(createTextBlock(currentRuns));
          currentRuns = [];
        }
        blocks.push(item);
      } else {
        currentRuns.push(item);
      }
    }

    if (currentRuns.length > 0 || blocks.length === 0) {
      blocks.push(createTextBlock(currentRuns));
    }

    return blocks;
  }

  private parseTable(el: Element, ctx: ParseContext): BlockNode[] {
    const rows: TableRowNode[] = [];
    let maxCols = 0;

    for (const trEl of childElements(el, "tr")) {
      const cells: TableCellNode[] = [];
      for (const tcEl of childElements(trEl, "tc")) {
        const cellBlocks: BlockNode[] = [];
        for (const child of tcEl.childNodes) {
          if (child.nodeType !== 1) continue;
          const parsed = this.parseBlockElement(child as Element, ctx);
          cellBlocks.push(...parsed);
        }
        if (cellBlocks.length === 0) cellBlocks.push(createParagraph(""));

        const tc = createTableCell(cellBlocks);
        const tcPr = firstChild(tcEl, "tcPr");
        if (tcPr) {
          const gridSpan = firstChild(tcPr, "gridSpan");
          if (gridSpan) {
            tc.colSpan = parseInt(getAttr(gridSpan, "val") ?? "1", 10);
          }
          const vMerge = firstChild(tcPr, "vMerge");
          if (vMerge) {
            const vmVal = getAttr(vMerge, "val");
            if (vmVal === "restart") {
              tc.rowSpan = 1;
            } else {
              tc.rowSpan = 0;
            }
          }
        }
        cells.push(tc);
      }
      maxCols = Math.max(maxCols, cells.length);
      const tr = createTableRow(cells.length);
      tr.cells = cells;
      rows.push(tr);
    }

    this.fixRowSpans(rows);

    if (maxCols === 0) maxCols = 1;
    if (rows.length === 0) rows.push(createTableRow(maxCols));

    const table = createTable(rows.length, maxCols);
    table.rows = rows;
    return [table];
  }

  private fixRowSpans(rows: TableRowNode[]): void {
    const colCount = Math.max(...rows.map((r) => r.cells.length), 0);
    for (let col = 0; col < colCount; col++) {
      let currentSpan = 0;
      let startRow = -1;
      for (let row = 0; row < rows.length; row++) {
        const cell = rows[row].cells[col];
        if (!cell) continue;
        if (cell.rowSpan === 1) {
          currentSpan = 1;
          startRow = row;
        } else if (cell.rowSpan === 0) {
          currentSpan++;
        } else {
          currentSpan = 0;
          startRow = -1;
        }
        if (startRow >= 0 && currentSpan > 1) {
          rows[startRow].cells[col].rowSpan = currentSpan;
        }
      }
    }
  }

  private parseAlign(pPr: Element | null): string | undefined {
    if (!pPr) return undefined;
    const jc = firstChild(pPr, "jc");
    if (jc) return getAttr(jc, "val") ?? undefined;
    return undefined;
  }
}
