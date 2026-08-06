import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "@/core/editorState.js";
import { getTableCellContentWidthForParagraph } from "@/ui/tableGeometry.js";

describe("nested table content width", () => {
  it("resolves percentage widths relative to the parent cell", () => {
    const outerParagraph = createEditorParagraph("outer");
    const innerParagraph = createEditorParagraph("inner");
    const inner = createEditorTable([
      createEditorTableRow([createEditorTableCell([innerParagraph])]),
    ]);
    inner.style = { width: "50%", layout: "fixed" };
    inner.gridCols = [100];

    const outer = createEditorTable([
      createEditorTableRow([
        createEditorTableCell([outerParagraph, inner]),
      ]),
    ]);
    outer.style = { width: 300, layout: "fixed" };
    outer.gridCols = [300];

    const document = createEditorDocument([outer]);
    const outerWidth = getTableCellContentWidthForParagraph(
      document,
      outerParagraph.id,
      0,
    );
    const innerWidth = getTableCellContentWidthForParagraph(
      document,
      innerParagraph.id,
      0,
    );

    expect(outerWidth).not.toBeNull();
    expect(innerWidth).not.toBeNull();
    expect(innerWidth!).toBeLessThan(outerWidth!);
    expect(innerWidth! / outerWidth!).toBeLessThan(0.55);
    expect(innerWidth!).toBeGreaterThan(24);
  });
});
