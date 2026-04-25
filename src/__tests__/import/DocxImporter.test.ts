import { describe, it, expect } from "vitest";
import { DocxImporter } from "../../engine/import/DocxImporter.js";
import * as fs from "fs";
import * as path from "path";
import {
  ListItemNode,
  OrderedListItemNode,
} from "../../core/document/BlockTypes.js";

describe("DocxImporter", () => {
  it("should parse a valid docx buffer into a DocumentModel", async () => {
    const docxPath = path.resolve(__dirname, "test.docx");
    const buffer = fs.readFileSync(docxPath);

    const importer = new DocxImporter();

    // Pass the Node Buffer directly - the importer handles Buffer vs ArrayBuffer
    const docModel = await importer.importFromBuffer(buffer as unknown as ArrayBuffer);

    expect(docModel).toBeDefined();
    expect(docModel.sections.length).toBeGreaterThan(0);

    const blocks = docModel.sections[0].children;
    expect(blocks.length).toBeGreaterThan(0);

    // We expect the first block to be a heading (based on python script)
    // Mammoth outputs <h1>Test Document</h1>
    const firstBlock = blocks[0];
    expect(firstBlock.kind).toBe("heading");
    if (firstBlock.kind === "heading") {
      expect(firstBlock.level).toBe(1);
      expect(firstBlock.children[0].text).toBe("Test Document");
    }

    // Paragraph with marks
    const paragraph = blocks.find(
      (b) => b.kind === "paragraph" && b.children.length > 1,
    );
    expect(paragraph).toBeDefined();
    if (paragraph && paragraph.kind === "paragraph") {
      const boldRun = paragraph.children.find((r) => r.marks.bold);
      const italicRun = paragraph.children.find((r) => r.marks.italic);

      expect(boldRun).toBeDefined();
      expect(italicRun).toBeDefined();
    }

    // Lists
    const listItems = blocks.filter(
      (b) => b.kind === "list-item",
    ) as ListItemNode[];
    expect(listItems.length).toBe(2);
    expect(listItems[0].children[0].text).toBe("Unordered item 1");

    const orderedItems = blocks.filter(
      (b) => b.kind === "ordered-list-item",
    ) as OrderedListItemNode[];
    expect(orderedItems.length).toBe(2);
    expect(orderedItems[0].children[0].text).toBe("Ordered item 1");
    expect(orderedItems[0].index).toBe(1);
    expect(orderedItems[1].index).toBe(2);

    // Table
    const table = blocks.find((b) => b.kind === "table");
    expect(table).toBeDefined();
    if (table && table.kind === "table") {
      expect(table.rows.length).toBe(2);
      expect(table.rows[0].cells.length).toBe(2);

      // Check first cell text
      const firstCellBlock = table.rows[0].cells[0].children[0];
      if (firstCellBlock.kind === "paragraph") {
        expect(firstCellBlock.children[0].text).toBe("Row 1, Col 1");
      }
    }
  });
});
