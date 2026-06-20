import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorFootnote,
  createEditorParagraph,
  createEditorRun,
  createFootnoteReferenceRun,
} from "@/core/editorState.js";
import { projectDocumentLayout } from "@/layoutProjection/index.js";
import {
  canReuseLayoutBlock,
  createLayoutIdentityStabilizer,
} from "@/ui/layoutIdentity.js";
import type { EditorLayoutBlock } from "@/core/model.js";

describe("layout identity stabilization", () => {
  it("does not reuse a page when only footnote text changes", () => {
    const body = createEditorParagraph("");
    const footnoteParagraph = createEditorParagraph("old note");
    const footnote = createEditorFootnote([footnoteParagraph]);
    body.runs = [
      createEditorRun("body"),
      createFootnoteReferenceRun(footnote.id, "1"),
    ];
    const document = createEditorDocument([body]);
    document.footnotes = { items: { [footnote.id]: footnote } };
    const stabilize = createLayoutIdentityStabilizer();

    const firstLayout = stabilize(
      projectDocumentLayout(document, undefined, undefined, undefined, {}),
    );
    const firstPage = firstLayout.pages[0]!;

    const updatedFootnoteParagraph = {
      ...footnoteParagraph,
      runs: [{ ...footnoteParagraph.runs[0]!, text: "updated note" }],
    };
    const updatedDocument = {
      ...document,
      footnotes: {
        items: {
          [footnote.id]: {
            ...footnote,
            blocks: [updatedFootnoteParagraph],
          },
        },
      },
    };

    const secondLayout = stabilize(
      projectDocumentLayout(
        updatedDocument,
        undefined,
        undefined,
        undefined,
        {},
      ),
    );
    const secondPage = secondLayout.pages[0]!;

    expect(secondPage).not.toBe(firstPage);
    expect(secondPage.footnoteBlocks?.[0]).not.toBe(
      firstPage.footnoteBlocks?.[0],
    );
  });

  it("does not reuse table blocks when partial cell segment offsets change", () => {
    const paragraph = createEditorParagraph("cell text");
    const block: EditorLayoutBlock = {
      blockId: "table:1:segment:0",
      sourceBlockId: "table:1",
      blockType: "table",
      globalIndex: 0,
      estimatedHeight: 40,
      sourceBlock: {
        id: "table:1",
        type: "table",
        rows: [
          {
            id: "row:1",
            cells: [{ id: "cell:1", blocks: [paragraph] }],
          },
        ],
      },
      tableSegment: {
        startRowIndex: 0,
        endRowIndex: 1,
        repeatedHeaderRowCount: 0,
        endRowCellBlockPositions: [{ blockIndex: 0, offset: 12 }],
      },
    };
    const changed: EditorLayoutBlock = {
      ...block,
      tableSegment: {
        ...block.tableSegment!,
        endRowCellBlockPositions: [{ blockIndex: 0, offset: 18 }],
      },
    };

    expect(canReuseLayoutBlock(block, changed)).toBe(false);
  });
});
