import { describe, expect, it } from "vitest";
import {
  createEditor2Document,
  createEditor2Paragraph,
  createEditor2StateFromDocument,
  createEditor2Table,
  createEditor2TableCell,
  createEditor2TableRow,
  resetEditor2Ids,
} from "../../core/editorState.js";
import { resolvePositionAtPoint } from "../../ui/positionAtPoint.js";

function createRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => "",
  } as DOMRect;
}

describe("resolvePositionAtPoint", () => {
  it("falls back to the nearest paragraph when document.elementFromPoint is unavailable", () => {
    resetEditor2Ids();
    const paragraph = createEditor2Paragraph("ABC");
    const state = createEditor2StateFromDocument(createEditor2Document([paragraph]));

    const surface = document.createElement("div");
    const paragraphElement = document.createElement("p");
    paragraphElement.dataset.paragraphId = paragraph.id;
    paragraphElement.getBoundingClientRect = () => createRect(100, 10, 40, 20);

    const chars = [
      createRect(100, 10, 10, 20),
      createRect(110, 10, 10, 20),
      createRect(120, 10, 10, 20),
    ].map((rect, index) => {
      const char = document.createElement("span");
      char.dataset.charIndex = String(index);
      char.getBoundingClientRect = () => rect;
      return char;
    });

    paragraphElement.append(...chars);
    surface.append(paragraphElement);

    const position = resolvePositionAtPoint({
      clientX: 121,
      clientY: 14,
      surface,
      state,
      documentLike: {},
    });

    expect(position?.paragraphId).toBe(paragraph.id);
    expect(position?.offset).toBe(2);
  });

  it("resolves to the first paragraph in the nearest table cell without elementFromPoint", () => {
    resetEditor2Ids();
    const firstCellParagraph = createEditor2Paragraph("A1");
    const secondCellParagraph = createEditor2Paragraph("B1");
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([firstCellParagraph]),
        createEditor2TableCell([secondCellParagraph]),
      ]),
    ]);
    const state = createEditor2StateFromDocument(createEditor2Document([table]));

    const surface = document.createElement("div");
    const tableBlock = document.createElement("div");
    tableBlock.dataset.testid = "editor-2-table";
    tableBlock.setAttribute("data-testid", "editor-2-table");
    tableBlock.setAttribute("data-block-id", table.id);

    const firstCell = document.createElement("td");
    firstCell.dataset.rowIndex = "0";
    firstCell.dataset.cellIndex = "0";
    firstCell.getBoundingClientRect = () => createRect(0, 0, 40, 20);

    const secondCell = document.createElement("td");
    secondCell.dataset.rowIndex = "0";
    secondCell.dataset.cellIndex = "1";
    secondCell.getBoundingClientRect = () => createRect(50, 0, 40, 20);

    tableBlock.append(firstCell, secondCell);
    surface.append(tableBlock);

    const position = resolvePositionAtPoint({
      clientX: 56,
      clientY: 8,
      surface,
      state,
      documentLike: {},
    });

    expect(position?.paragraphId).toBe(secondCellParagraph.id);
    expect(position?.offset).toBe(0);
  });
});
