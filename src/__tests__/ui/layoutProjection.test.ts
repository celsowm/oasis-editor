import { describe, it, expect } from "vitest";
import {
  clearProjectedParagraphLayoutCache,
  projectParagraphLayout,
  projectBlocksLayout,
  estimateParagraphBlockHeight,
} from "../../layoutProjection/index.js";
import {
  createEditorParagraph,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
} from "../../core/editorState.js";
import { buildSegmentTable } from "../../core/tableLayout.js";
import type { EditorPageSettings } from "../../core/model.js";
import type { ITextMeasurer, TextMeasureOptions } from "../../core/engine.js";

const A4: EditorPageSettings = {
  width: 816,
  height: 1056,
  orientation: "portrait",
  margins: {
    top: 96,
    right: 96,
    bottom: 96,
    left: 96,
    header: 48,
    footer: 48,
    gutter: 0,
  },
};

describe("layout projection", () => {
  describe("projectParagraphLayout", () => {
    function createFixedWidthMeasurer(charWidth: number): ITextMeasurer {
      return {
        composeMeasuredParagraphLines(options: TextMeasureOptions) {
          const text = options.fragments
            .map((fragment) => fragment.text)
            .join("");
          const slots = Array.from(
            { length: text.length + 1 },
            (_, offset) => ({
              paragraphId: options.paragraph.id,
              offset,
              left: offset * charWidth,
              top: 0,
              height: 16,
            }),
          );
          return [
            {
              paragraphId: options.paragraph.id,
              index: 0,
              startOffset: 0,
              endOffset: text.length,
              top: 0,
              height: 16,
              slots,
              fragments: [],
            },
          ];
        },
        resolveRenderedLineHeightPx: () => 16,
      };
    }

    it("projects a simple paragraph into a single line", () => {
      const p = createEditorParagraph("hello");
      const layout = projectParagraphLayout(p, 0, 1, undefined, 600);

      expect(layout.paragraphId).toBe(p.id);
      expect(layout.text).toBe("hello");
      expect(layout.lines).toHaveLength(1);
      expect(layout.lines[0].fragments).toHaveLength(1);
      expect(layout.lines[0].fragments[0].text).toBe("hello");
    });

    it("splits long text into multiple lines", () => {
      // With a very narrow width, text should split.
      const p = createEditorParagraph(
        "This is a very long paragraph that should definitely wrap into multiple lines given the width constraints of the layout engine.",
      );
      const layout = projectParagraphLayout(p, 0, 1, undefined, 50);

      expect(layout.lines.length).toBeGreaterThan(1);
    });

    it("can clear cached paragraph geometry after async font metrics load", () => {
      const p = createEditorParagraph("font");
      const wide = projectParagraphLayout(
        p,
        0,
        1,
        undefined,
        600,
        createFixedWidthMeasurer(10),
      );
      const stillCached = projectParagraphLayout(
        p,
        0,
        1,
        undefined,
        600,
        createFixedWidthMeasurer(5),
      );

      expect(stillCached.lines[0]!.slots.at(-1)?.left).toBe(
        wide.lines[0]!.slots.at(-1)?.left,
      );

      clearProjectedParagraphLayoutCache();
      const recalculated = projectParagraphLayout(
        p,
        0,
        1,
        undefined,
        600,
        createFixedWidthMeasurer(5),
      );

      expect(recalculated.lines[0]!.slots.at(-1)?.left).toBe(20);
    });
  });

  describe("projectBlocksLayout", () => {
    it("places blocks on a single page if they fit", () => {
      const p1 = createEditorParagraph("p1");
      const p2 = createEditorParagraph("p2");
      const pages = projectBlocksLayout({
        blocks: [p1, p2],
        pageSettings: A4,
        maxPageHeight: 800,
      });

      expect(pages).toHaveLength(1);
      expect(pages[0].blocks).toHaveLength(2);
    });

    it("keeps spacing before for the first paragraph on a page", () => {
      const p = createEditorParagraph("heading");
      p.style = { spacingBefore: 24, spacingAfter: 0 };
      const pages = projectBlocksLayout({
        blocks: [p],
        pageSettings: A4,
        maxPageHeight: 800,
      });
      const block = pages[0]!.blocks[0]!;
      const lineHeights = block.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );

      expect(block.layout?.startOffset).toBe(0);
      expect(block.estimatedHeight).toBeCloseTo(lineHeights + 24, 4);
    });

    it("does not repeat spacing before on a continued paragraph segment", () => {
      const p = createEditorParagraph("word ".repeat(80));
      p.style = { spacingBefore: 24, spacingAfter: 0, widowControl: false };
      const pages = projectBlocksLayout({
        blocks: [p],
        pageSettings: A4,
        maxPageHeight: 50,
      });
      const continuedBlock = pages.find(
        (page) => (page.blocks[0]?.layout?.startOffset ?? 0) > 0,
      )?.blocks[0];
      const lineHeights = continuedBlock!.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );

      expect(continuedBlock).toBeDefined();
      expect(continuedBlock!.estimatedHeight).toBeCloseTo(lineHeights, 4);
    });

    it("creates new pages for overflowing blocks", () => {
      const blocks = Array.from({ length: 50 }, (_, i) =>
        createEditorParagraph(`Paragraph ${i}`),
      );
      // maxPageHeight 100 is very small, should force many pages
      const pages = projectBlocksLayout({
        blocks,
        pageSettings: A4,
        maxPageHeight: 100,
      });

      expect(pages.length).toBeGreaterThan(1);
    });

    it("keeps a Word-like final paragraph on the page when only trailing spacing overflows", () => {
      const pageSettings: EditorPageSettings = {
        width: 794,
        height: 1123,
        orientation: "portrait",
        margins: {
          top: 94,
          right: 113,
          bottom: 94,
          left: 113,
          header: 47,
          footer: 47,
          gutter: 0,
        },
      };
      const blocks = Array.from({ length: 29 }, (_, index) => {
        const paragraph = createEditorParagraph(
          index === 28 ? "Das" : `P${index + 1}`,
        );
        paragraph.style = { spacingAfter: 11, lineHeight: 1.1 };
        return paragraph;
      });
      const nextPage = createEditorParagraph("sd");
      nextPage.style = {
        spacingAfter: 11,
        lineHeight: 1.1,
        pageBreakBefore: true,
      };

      const pages = projectBlocksLayout({
        blocks: [...blocks, nextPage],
        pageSettings,
        maxPageHeight: 935,
      });

      expect(pages).toHaveLength(2);
      expect(pages[0]!.blocks).toHaveLength(29);
      expect(pages[0]!.blocks.at(-1)?.layout?.text).toBe("Das");
      expect(pages[1]!.blocks[0]?.layout?.text).toBe("sd");
    });

    it("keeps a final paragraph on the page in fast mode when only trailing spacing overflows", () => {
      const pageSettings: EditorPageSettings = {
        width: 794,
        height: 1123,
        orientation: "portrait",
        margins: {
          top: 94,
          right: 113,
          bottom: 94,
          left: 113,
          header: 47,
          footer: 47,
          gutter: 0,
        },
      };
      const blocks = Array.from({ length: 29 }, (_, index) => {
        const paragraph = createEditorParagraph(
          index === 28 ? "Das" : `P${index + 1}`,
        );
        paragraph.style = { spacingAfter: 11, lineHeight: 1.1 };
        return paragraph;
      });
      const nextPage = createEditorParagraph("sd");
      nextPage.style = {
        spacingAfter: 11,
        lineHeight: 1.1,
        pageBreakBefore: true,
      };

      const pages = projectBlocksLayout({
        blocks: [...blocks, nextPage],
        pageSettings,
        maxPageHeight: 935,
      });

      expect(pages).toHaveLength(2);
      expect(pages[0]!.blocks).toHaveLength(29);
      expect(pages[0]!.blocks.at(-1)?.layout?.text).toBe("Das");
      expect(pages[1]!.blocks[0]?.layout?.text).toBe("sd");
    });

    it("collapses contextual spacing between adjacent same-style paragraphs", () => {
      const first = createEditorParagraph("first");
      first.style = {
        spacingBefore: 0,
        spacingAfter: 20,
        contextualSpacing: true,
      };
      const second = createEditorParagraph("second");
      second.style = {
        spacingBefore: 10,
        spacingAfter: 0,
        contextualSpacing: true,
      };

      const pages = projectBlocksLayout({
        blocks: [first, second],
        pageSettings: A4,
        maxPageHeight: 800,
      });
      const firstBlock = pages[0]!.blocks[0]!;
      const secondBlock = pages[0]!.blocks[1]!;
      const firstLineHeights = firstBlock.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );
      const secondLineHeights = secondBlock.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );

      expect(firstBlock.estimatedHeight).toBeCloseTo(firstLineHeights, 4);
      expect(secondBlock.estimatedHeight).toBeCloseTo(secondLineHeights, 4);
    });

    it("preserves contextual spacing between different paragraph styles", () => {
      const first = createEditorParagraph("first");
      first.style = {
        spacingBefore: 0,
        spacingAfter: 20,
        contextualSpacing: true,
      };
      const second = createEditorParagraph("second");
      second.style = {
        align: "center",
        spacingBefore: 10,
        spacingAfter: 0,
        contextualSpacing: true,
      };

      const pages = projectBlocksLayout({
        blocks: [first, second],
        pageSettings: A4,
        maxPageHeight: 800,
      });
      const firstBlock = pages[0]!.blocks[0]!;
      const secondBlock = pages[0]!.blocks[1]!;
      const firstLineHeights = firstBlock.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );
      const secondLineHeights = secondBlock.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );

      expect(firstBlock.estimatedHeight).toBeCloseTo(firstLineHeights + 20, 4);
      expect(secondBlock.estimatedHeight).toBeCloseTo(
        secondLineHeights + 10,
        4,
      );
    });

    it("does not collapse contextual paragraph spacing across a table boundary", () => {
      const first = createEditorParagraph("first");
      first.style = {
        spacingBefore: 0,
        spacingAfter: 20,
        contextualSpacing: true,
      };
      const second = createEditorParagraph("second");
      second.style = {
        spacingBefore: 10,
        spacingAfter: 0,
        contextualSpacing: true,
      };
      const table = createEditorTable([
        createEditorTableRow([
          createEditorTableCell([createEditorParagraph("cell")]),
        ]),
      ]);

      const pages = projectBlocksLayout({
        blocks: [first, table, second],
        pageSettings: A4,
        maxPageHeight: 800,
      });
      const firstBlock = pages[0]!.blocks[0]!;
      const secondBlock = pages[0]!.blocks[2]!;
      const firstLineHeights = firstBlock.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );
      const secondLineHeights = secondBlock.layout!.lines.reduce(
        (sum, line) => sum + line.height,
        0,
      );

      expect(firstBlock.estimatedHeight).toBeCloseTo(firstLineHeights + 20, 4);
      expect(secondBlock.estimatedHeight).toBeCloseTo(
        secondLineHeights + 10,
        4,
      );
    });

    it("splits table rows across pages when cells contain multiple paragraphs", () => {
      const table = createEditorTable([
        createEditorTableRow([
          createEditorTableCell([
            createEditorParagraph("Paragraph 1"),
            createEditorParagraph("Paragraph 2"),
            createEditorParagraph("Paragraph 3"),
            createEditorParagraph("Paragraph 4"),
          ]),
        ]),
      ]);

      const pages = projectBlocksLayout({
        blocks: [table],
        pageSettings: A4,
        maxPageHeight: 70,
      });

      expect(pages.length).toBeGreaterThan(1);

      // Page 1 should contain a table segment for row 0, starting at block index 0 and ending before the last block
      const firstPageTable = pages[0]!.blocks[0]!;
      expect(firstPageTable.blockType).toBe("table");
      expect(firstPageTable.tableSegment).toBeDefined();
      expect(firstPageTable.tableSegment!.startRowIndex).toBe(0);
      expect(firstPageTable.tableSegment!.endRowIndex).toBe(1);
      expect(
        firstPageTable.tableSegment!.startRowCellBlockStarts,
      ).toBeUndefined();
      expect(firstPageTable.tableSegment!.endRowCellBlockEnds).toBeDefined();
      // It should have split after paragraph 1 or 2
      expect(
        firstPageTable.tableSegment!.endRowCellBlockEnds![0],
      ).toBeGreaterThan(0);
      expect(firstPageTable.tableSegment!.endRowCellBlockEnds![0]).toBeLessThan(
        4,
      );

      // Page 2 should contain the continuation of the table segment for row 0
      const secondPageTable = pages[1]!.blocks[0]!;
      expect(secondPageTable.blockType).toBe("table");
      expect(secondPageTable.tableSegment).toBeDefined();
      expect(secondPageTable.tableSegment!.startRowIndex).toBe(0);
      expect(secondPageTable.tableSegment!.endRowIndex).toBe(1);
      expect(
        secondPageTable.tableSegment!.startRowCellBlockStarts,
      ).toBeDefined();
      expect(secondPageTable.tableSegment!.startRowCellBlockStarts![0]).toBe(
        firstPageTable.tableSegment!.endRowCellBlockEnds![0],
      );
    });

    it("splits a long table-cell paragraph across pages when the row can split", () => {
      const paragraph = createEditorParagraph(
        Array.from({ length: 80 }, (_, index) => `word${index}`).join(" "),
      );
      paragraph.style = { spacingBefore: 0, spacingAfter: 0, lineHeight: 1 };
      const table = createEditorTable([
        createEditorTableRow([createEditorTableCell([paragraph])]),
      ]);

      const pages = projectBlocksLayout({
        blocks: [table],
        pageSettings: A4,
        maxPageHeight: 70,
      });

      expect(pages.length).toBeGreaterThan(1);
      const firstPageTable = pages[0]!.blocks[0]!;
      const secondPageTable = pages[1]!.blocks[0]!;
      expect(
        firstPageTable.tableSegment?.endRowCellBlockPositions?.[0],
      ).toBeDefined();
      expect(
        firstPageTable.tableSegment!.endRowCellBlockPositions![0]!.offset,
      ).toBeGreaterThan(0);
      expect(
        secondPageTable.tableSegment!.startRowCellBlockPositions![0],
      ).toEqual(firstPageTable.tableSegment!.endRowCellBlockPositions![0]);

      const segmentTexts = pages.map((page) => {
        const segment = page.blocks[0]!.tableSegment!;
        const segmentTable = buildSegmentTable(table, segment);
        return segmentTable.rows[0]!.cells[0]!.blocks.flatMap((block) =>
          block.runs.map((run) => run.text),
        ).join("");
      });
      const [firstText, secondText] = segmentTexts;
      expect(firstText.length).toBeGreaterThan(0);
      expect(secondText!.length).toBeGreaterThan(0);
      expect(segmentTexts.join("")).toBe(
        paragraph.runs.map((run) => run.text).join(""),
      );
    });

    it("keeps a long single-paragraph table row together when cantSplit is true", () => {
      const paragraph = createEditorParagraph(
        Array.from({ length: 80 }, (_, index) => `word${index}`).join(" "),
      );
      const row = createEditorTableRow([createEditorTableCell([paragraph])]);
      row.style = { cantSplit: true };
      const table = createEditorTable([row]);

      const pages = projectBlocksLayout({
        blocks: [table],
        pageSettings: A4,
        maxPageHeight: 70,
      });

      expect(pages).toHaveLength(1);
      expect(pages[0]!.blocks[0]!.tableSegment).toBeUndefined();
    });
  });

  describe("estimateParagraphBlockHeight", () => {
    it("estimates height including spacing", () => {
      const p = createEditorParagraph("hello");
      p.style = { spacingBefore: 10, spacingAfter: 20 };
      const height = estimateParagraphBlockHeight(p, undefined, 600);

      // height = spacingBefore + spacingAfter + lineHeights
      // Default line height for 15px font is usually around 17-18px
      expect(height).toBeGreaterThan(30);
    });
  });
});
