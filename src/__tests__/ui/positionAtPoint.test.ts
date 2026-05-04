import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
  resetEditorIds,
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
    resetEditorIds();
    const paragraph = createEditorParagraph("ABC");
    const state = createEditorStateFromDocument(createEditorDocument([paragraph]));

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
    resetEditorIds();
    const firstCellParagraph = createEditorParagraph("A1");
    const secondCellParagraph = createEditorParagraph("B1");
    const table = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([firstCellParagraph]),
        createEditorTableCell([secondCellParagraph]),
      ]),
    ]);
    const state = createEditorStateFromDocument(createEditorDocument([table]));

    const surface = document.createElement("div");
    const tableBlock = document.createElement("div");
    tableBlock.dataset.testid = "editor-table";
    tableBlock.setAttribute("data-testid", "editor-table");
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

  it("resolves offsets across multiple DOM segments for the same paragraph", () => {
    resetEditorIds();
    const paragraph = createEditorParagraph("ABCD");
    const state = createEditorStateFromDocument(createEditorDocument([paragraph]));

    const surface = document.createElement("div");
    const firstSegment = document.createElement("p");
    firstSegment.dataset.paragraphId = paragraph.id;
    firstSegment.dataset.startOffset = "0";
    firstSegment.getBoundingClientRect = () => createRect(100, 10, 20, 20);

    const secondSegment = document.createElement("p");
    secondSegment.dataset.paragraphId = paragraph.id;
    secondSegment.dataset.startOffset = "2";
    secondSegment.getBoundingClientRect = () => createRect(100, 40, 20, 20);

    [
      createRect(100, 10, 10, 20),
      createRect(110, 10, 10, 20),
    ].forEach((rect, index) => {
      const char = document.createElement("span");
      char.dataset.charIndex = String(index);
      char.getBoundingClientRect = () => rect;
      firstSegment.append(char);
    });

    [
      createRect(100, 40, 10, 20),
      createRect(110, 40, 10, 20),
    ].forEach((rect, index) => {
      const char = document.createElement("span");
      char.dataset.charIndex = String(index + 2);
      char.getBoundingClientRect = () => rect;
      secondSegment.append(char);
    });

    surface.append(firstSegment, secondSegment);

    const position = resolvePositionAtPoint({
      clientX: 119,
      clientY: 45,
      surface,
      state,
      documentLike: {},
    });

    expect(position?.paragraphId).toBe(paragraph.id);
    expect(position?.offset).toBe(4);
  });
});
