import { describe, it, expect } from "vitest";
import { StyleRegistry } from "../engine/ir/DocumentIR.js";
import { StyleResolver, applyStyleToBlock, applyStylesToBlocks } from "../core/document/StyleResolver.js";
import { createParagraph, createTextRun, createHeading } from "../core/document/DocumentFactory.js";

describe("StyleResolver", () => {
  it("should resolve a simple style chain", () => {
    const registry = new StyleRegistry();
    registry.add({
      styleId: "CustomStyle",
      type: "paragraph",
      runProps: { bold: true, color: "#FF0000", fontSize: 14 },
      paragraphProps: { align: "center", indentLeft: 20 },
    });

    const resolver = new StyleResolver(registry);
    const style = resolver.resolve("CustomStyle");

    expect(style.bold).toBe(true);
    expect(style.marks.color).toBe("#FF0000");
    expect(style.fontSize).toBe(14);
    expect(style.align).toBe("center");
    expect(style.indentation).toBe(20);
  });

  it("should inherit from basedOn styles", () => {
    const registry = new StyleRegistry();
    registry.add({
      styleId: "Base",
      type: "paragraph",
      runProps: { italic: true, fontFamily: "Arial" },
    });
    registry.add({
      styleId: "Derived",
      type: "paragraph",
      basedOn: "Base",
      runProps: { bold: true },
    });

    const resolver = new StyleResolver(registry);
    const style = resolver.resolve("Derived");

    expect(style.italic).toBe(true);
    expect(style.bold).toBe(true);
    expect(style.marks.fontFamily).toBe("Arial");
  });

  it("should apply style marks to runs without overwriting explicit marks", () => {
    const p = createParagraph("Hello");
    p.children = [createTextRun("Hello", { bold: false, color: "#0000FF" })];
    p.styleId = "TestStyle";

    const style: import("../core/document/StyleResolver.js").ResolvedStyle = {
      marks: { bold: true, color: "#FF0000" },
      bold: true,
    };

    const result = applyStyleToBlock(p, style);
    expect(result.children[0].marks.bold).toBe(false); // explicit false wins
    expect(result.children[0].marks.color).toBe("#0000FF"); // explicit color wins
  });

  it("should apply style alignment when block has default alignment", () => {
    const p = createParagraph("Hello");
    p.align = "left";
    p.styleId = "Centered";

    const style: import("../core/document/StyleResolver.js").ResolvedStyle = {
      marks: {},
      align: "center",
    };

    const result = applyStyleToBlock(p, style);
    expect(result.align).toBe("center");
  });

  it("should not overwrite explicit alignment", () => {
    const p = createParagraph("Hello");
    p.align = "right";
    p.styleId = "Centered";

    const style: import("../core/document/StyleResolver.js").ResolvedStyle = {
      marks: {},
      align: "center",
    };

    const result = applyStyleToBlock(p, style);
    expect(result.align).toBe("right");
  });

  it("should apply styles recursively through tables", () => {
    const registry = new StyleRegistry();
    registry.add({
      styleId: "BoldStyle",
      type: "paragraph",
      runProps: { bold: true },
    });

    const cellPara = createParagraph("Cell text");
    cellPara.styleId = "BoldStyle";

    const table = {
      id: "table:1",
      kind: "table" as const,
      columnWidths: [100],
      rows: [{
        id: "row:1",
        kind: "table-row" as const,
        cells: [{
          id: "cell:1",
          kind: "table-cell" as const,
          children: [cellPara],
        }],
      }],
    };

    const resolver = new StyleResolver(registry);
    const result = applyStylesToBlocks([table], resolver);

    const resultTable = result[0] as any;
    const resultCellPara = resultTable.rows[0].cells[0].children[0];
    expect(resultCellPara.children[0].marks.bold).toBe(true);
  });
});
