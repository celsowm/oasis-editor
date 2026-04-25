import * as mammoth from "mammoth";
import { DOMParser } from "@xmldom/xmldom";
import {
  DocumentModel,
  createDocumentMetadata,
} from "../../core/document/DocumentTypes.js";
import { DocumentImporter } from "../../core/import/DocumentImporter.js";
import {
  BlockNode,
  MarkSet,
  TextRun,
  TableNode,
  TableRowNode,
  TableCellNode,
  ListItemNode,
  OrderedListItemNode,
} from "../../core/document/BlockTypes.js";
import { createSection } from "../../core/document/DocumentFactory.js";
import {
  createParagraph,
  createHeading,
  createTextRun,
  createTable,
  createTableRow,
  createTableCell,
} from "../../core/document/DocumentFactory.js";

let blockCounter = 1000;
const nextBlockId = (): string => `block:import:${blockCounter++}`;

export class DocxImporter implements DocumentImporter {
  public async importFromBuffer(
    arrayBuffer: ArrayBuffer,
  ): Promise<DocumentModel> {
    // mammoth supports different input formats depending on the platform:
    // - In browser: { arrayBuffer: ArrayBuffer }
    // - In Node.js: { buffer: Buffer }
    // When running in Node.js/Vitest, the buffer from fs.readFileSync is a Buffer.
    // Check if the input is actually backed by a Node Buffer by checking
    // the constructor name, or handle ArrayBuffer specifically.

    // Check if this is actually a Node Buffer (backed by a different buffer)
    const isNodeBuffer =
      (arrayBuffer as unknown as { constructor?: { name: string } })
        ?.constructor?.name === "Buffer";

    let result;

    if (isNodeBuffer) {
      // Convert ArrayBuffer back to Node Buffer
      const nodeBuffer = Buffer.from(arrayBuffer);
      result = await mammoth.convertToHtml({ buffer: nodeBuffer });
    } else {
      try {
        // Try ArrayBuffer first (browser environment)
        result = await mammoth.convertToHtml({ arrayBuffer });
      } catch {
        // Fallback: this might be a Node Buffer viewed as ArrayBuffer
        // Slice the underlying buffer to get a proper copy
        const source = arrayBuffer as unknown as { buffer?: Uint8Array };
        if (source.buffer) {
          const nodeBuffer = Buffer.from(source.buffer);
          result = await mammoth.convertToHtml({ buffer: nodeBuffer });
        } else {
          throw new Error("Could not parse document");
        }
      }
    }

    const html = result.value;
    return this.parseHtmlToDocument(html);
  }

  private parseHtmlToDocument(html: string): DocumentModel {
    const wrappedHtml = `<div id="root">${html}</div>`;
    const parser = new DOMParser();
    const doc = parser.parseFromString(wrappedHtml, "text/html");
    const root = doc.getElementById("root");

    const blocks: BlockNode[] = [];
    if (root) {
      for (let i = 0; i < root.childNodes.length; i++) {
        const child = root.childNodes[i];
        const newBlocks = this.parseBlockNodes(child as unknown as Node);
        blocks.push(...newBlocks);
      }
    }

    // Default to at least one empty paragraph if empty
    if (blocks.length === 0) {
      blocks.push(createParagraph(""));
    }

    const section = createSection(blocks);

    return {
      id: `doc:${Date.now()}`,
      revision: 0,
      metadata: createDocumentMetadata("Imported Document"),
      sections: [section],
    };
  }

  private parseBlockNodes(
    node: Node,
    listContext?: { type: "ul" | "ol"; index: number },
  ): BlockNode[] {
    if (node.nodeType !== 1) return []; // Only Element nodes
    const el = node as Element;
    const tagName = el.tagName.toLowerCase();

    if (tagName === "p") {
      const runs = this.parseRuns(el);
      const align = this.parseAlignment(el) || "left";

      if (listContext) {
        if (listContext.type === "ul") {
          const li: ListItemNode = {
            id: nextBlockId(),
            kind: "list-item",
            align: align as "left" | "center" | "right" | "justify",
            children: runs.length > 0 ? runs : [createTextRun("")],
          };
          return [li];
        } else {
          const li: OrderedListItemNode = {
            id: nextBlockId(),
            kind: "ordered-list-item",
            index: listContext.index,
            align: align as "left" | "center" | "right" | "justify",
            children: runs.length > 0 ? runs : [createTextRun("")],
          };
          return [li];
        }
      }

      const p = createParagraph("");
      p.children = runs.length > 0 ? runs : [createTextRun("")];
      p.align = align as "left" | "center" | "right" | "justify";
      return [p];
    } else if (tagName.match(/^h[1-6]$/)) {
      const level = parseInt(tagName.charAt(1), 10) as 1 | 2 | 3 | 4 | 5 | 6;
      const runs = this.parseRuns(el);
      const align = this.parseAlignment(el) || "left";
      const h = createHeading("", level);
      h.children = runs.length > 0 ? runs : [createTextRun("")];
      h.align = align as "left" | "center" | "right";
      return [h];
    } else if (tagName === "table") {
      const table = this.parseTableNode(el);
      return table ? [table] : [];
    } else if (tagName === "ul" || tagName === "ol") {
      const isOrdered = tagName === "ol";
      const listBlocks: BlockNode[] = [];
      let itemIndex = 1;

      for (let i = 0; i < el.childNodes.length; i++) {
        const liNode = el.childNodes[i] as unknown as Element;
        if (liNode.nodeType === 1 && liNode.tagName.toLowerCase() === "li") {
          // A mammoth <li> usually contains a <p>
          let foundP = false;
          for (let j = 0; j < liNode.childNodes.length; j++) {
            const childNode = liNode.childNodes[j] as unknown as Node;
            if (childNode.nodeType === 1) {
              const pBlocks = this.parseBlockNodes(childNode, {
                type: isOrdered ? "ol" : "ul",
                index: itemIndex,
              });
              if (pBlocks.length > 0) {
                listBlocks.push(...pBlocks);
                foundP = true;
              }
            }
          }
          // If no inner <p> was found, process the <li> itself as a paragraph-like node
          if (!foundP) {
            const runs = this.parseRuns(liNode);
            if (isOrdered) {
              listBlocks.push({
                id: nextBlockId(),
                kind: "ordered-list-item",
                index: itemIndex,
                align: "left",
                children: runs.length > 0 ? runs : [createTextRun("")],
              } as OrderedListItemNode);
            } else {
              listBlocks.push({
                id: nextBlockId(),
                kind: "list-item",
                align: "left",
                children: runs.length > 0 ? runs : [createTextRun("")],
              } as ListItemNode);
            }
          }

          itemIndex++;
        }
      }
      return listBlocks;
    }

    return [];
  }

  private parseTableNode(tableEl: Element): TableNode | null {
    const rows: TableRowNode[] = [];
    let maxCols = 0;

    // Find tbody if exists, else use table
    const childrenToScan =
      tableEl.getElementsByTagName("tbody").length > 0
        ? tableEl.getElementsByTagName("tbody")[0].childNodes
        : tableEl.childNodes;

    for (let i = 0; i < childrenToScan.length; i++) {
      const rowNode = childrenToScan[i];
      if (
        rowNode.nodeType === 1 &&
        (rowNode as unknown as Element).tagName.toLowerCase() === "tr"
      ) {
        const trEl = rowNode as unknown as Element;
        const cells: TableCellNode[] = [];
        for (let j = 0; j < trEl.childNodes.length; j++) {
          const cellNode = trEl.childNodes[j];
          if (
            cellNode.nodeType === 1 &&
            ((cellNode as unknown as Element).tagName.toLowerCase() === "td" ||
              (cellNode as unknown as Element).tagName.toLowerCase() === "th")
          ) {
            const tdEl = cellNode as unknown as Element;
            const cellBlocks: BlockNode[] = [];
            for (let k = 0; k < tdEl.childNodes.length; k++) {
              const b = this.parseBlockNodes(
                tdEl.childNodes[k] as unknown as Node,
              );
              cellBlocks.push(...b);
            }
            if (cellBlocks.length === 0) cellBlocks.push(createParagraph(""));

            const tc = createTableCell(cellBlocks);
            cells.push(tc);
          }
        }
        maxCols = Math.max(maxCols, cells.length);
        const tr = createTableRow(cells.length);
        tr.cells = cells;
        rows.push(tr);
      }
    }

    if (maxCols === 0) maxCols = 1;
    if (rows.length === 0) rows.push(createTableRow(maxCols));

    const table = createTable(rows.length, maxCols);
    table.rows = rows;
    return table;
  }

  private parseRuns(node: Node, currentMarks: MarkSet = {}): TextRun[] {
    const runs: TextRun[] = [];

    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i] as unknown as Node;

      if (child.nodeType === 3) {
        // Text node
        const text = child.nodeValue || "";
        if (text) {
          runs.push(createTextRun(text, { ...currentMarks }));
        }
      } else if (child.nodeType === 1) {
        // Element
        const el = child as unknown as Element;
        const tagName = el.tagName.toLowerCase();

        const newMarks = { ...currentMarks };
        if (tagName === "strong" || tagName === "b") {
          newMarks.bold = true;
        } else if (tagName === "em" || tagName === "i") {
          newMarks.italic = true;
        } else if (tagName === "u") {
          newMarks.underline = true;
        } else if (tagName === "s" || tagName === "del" || tagName === "strike") {
          newMarks.strike = true;
        }

        runs.push(...this.parseRuns(child, newMarks));
      }
    }

    return runs;
  }

  private parseAlignment(el: Element): string | null {
    const style = el.getAttribute("style");
    if (style) {
      const alignMatch = style.match(
        /text-align:\s*(left|center|right|justify)/,
      );
      if (alignMatch) return alignMatch[1];
    }
    return null;
  }
}
