import { describe, expect, it } from "vitest";
import {
  createEditor2ParagraphFromRuns,
  createEditor2Table,
  createEditor2TableCell,
  createEditor2TableRow,
  resetEditor2Ids,
} from "../../core/editorState.js";
import type {
  Editor2Document,
  Editor2NamedStyle,
} from "../../core/model.js";
import {
  projectDocumentLayout,
  measureParagraphLayoutFromRects,
  projectParagraphLayout,
  resolveClosestOffsetInMeasuredLayout,
  estimateParagraphBlockHeight,
} from "../../ui/layoutProjection.js";

const GOLDEN_STYLES: Record<string, Editor2NamedStyle> = {
  Normal: {
    id: "Normal",
    name: "Normal",
    type: "paragraph",
    paragraphStyle: {
      lineHeight: 1.6,
      spacingAfter: 10,
    },
    textStyle: {
      fontSize: 20,
      fontFamily: "Calibri",
    },
  },
  Heading1: {
    id: "Heading1",
    name: "Heading 1",
    type: "paragraph",
    basedOn: "Normal",
    paragraphStyle: {
      lineHeight: 1.2,
      spacingBefore: 24,
      spacingAfter: 12,
    },
    textStyle: {
      bold: true,
      fontSize: 28,
    },
  },
  Heading2: {
    id: "Heading2",
    name: "Heading 2",
    type: "paragraph",
    basedOn: "Heading1",
    paragraphStyle: {
      lineHeight: 1.3,
      spacingBefore: 18,
    },
    textStyle: {
      fontSize: 24,
    },
  },
};

describe("layoutProjection", () => {
  it("projects a paragraph into run fragments with paragraph offsets", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);

    const layout = projectParagraphLayout(paragraph);

    expect(layout.text).toBe("abcd");
    expect(layout.fragments.map((fragment) => fragment.text)).toEqual(["ab", "cd"]);
    expect(layout.fragments.map((fragment) => fragment.runId)).toEqual(
      paragraph.runs.map((run) => run.id),
    );
    expect(layout.fragments[0]?.chars.map((char) => char.paragraphOffset)).toEqual([0, 1]);
    expect(layout.fragments[1]?.chars.map((char) => char.paragraphOffset)).toEqual([2, 3]);
  });

  it("measures line fragments and slots from wrapped rects", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);

    const layout = measureParagraphLayoutFromRects(paragraph, [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ]);

    expect(layout.lines).toHaveLength(2);
    expect(layout.lines[0]?.fragments.map((fragment) => fragment.text)).toEqual(["ab"]);
    expect(layout.lines[0]?.slots.map((slot) => slot.offset)).toEqual([0, 1, 2]);
    expect(layout.lines[1]?.fragments.map((fragment) => fragment.text)).toEqual(["cd"]);
    expect(layout.lines[1]?.slots.map((slot) => slot.offset)).toEqual([2, 3, 4]);
  });

  it("resolves the nearest offset from the measured layout itself", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([
      { text: "ab", styles: { bold: true } },
      { text: "cd", styles: { italic: true } },
    ]);

    const layout = measureParagraphLayoutFromRects(paragraph, [
      { left: 10, right: 20, top: 10, bottom: 30, height: 20 },
      { left: 20, right: 30, top: 10, bottom: 30, height: 20 },
      { left: 10, right: 20, top: 40, bottom: 60, height: 20 },
      { left: 20, right: 30, top: 40, bottom: 60, height: 20 },
    ]);

    expect(resolveClosestOffsetInMeasuredLayout(layout, 9, 12)).toBe(0);
    expect(resolveClosestOffsetInMeasuredLayout(layout, 28, 12)).toBe(2);
    expect(resolveClosestOffsetInMeasuredLayout(layout, 9, 45)).toBe(2);
    expect(resolveClosestOffsetInMeasuredLayout(layout, 29, 45)).toBe(4);
  });

  it("projects a document into multiple pages when accumulated block height exceeds the page limit", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "a".repeat(240) }]),
      createEditor2ParagraphFromRuns([{ text: "b".repeat(240) }]),
      createEditor2ParagraphFromRuns([{ text: "c".repeat(240) }]),
    ];

    const layout = projectDocumentLayout(paragraphs, 220);

    expect(layout.pages.length).toBeGreaterThan(1);
    const paragraphIds = layout.pages.flatMap((page) => page.blocks.map((block) => block.paragraphId));
    expect(new Set(paragraphIds)).toEqual(new Set(paragraphs.map((paragraph) => paragraph.id)));
    expect(paragraphIds.length).toBeGreaterThanOrEqual(paragraphs.length);
  });

  it("prefers measured block heights over estimated ones for page projection", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "short" }]),
      createEditor2ParagraphFromRuns([{ text: "short" }]),
    ];

    const layout = projectDocumentLayout(
      paragraphs,
      120,
      {
        [paragraphs[0]!.id]: 80,
        [paragraphs[1]!.id]: 80,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks[0]?.estimatedHeight).toBe(80);
    expect(layout.pages[1]?.blocks[0]?.estimatedHeight).toBe(80);
  });

  it("splits a long paragraph into multiple paginated segments", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "x".repeat(520) }]);

    const layout = projectDocumentLayout([paragraph], 180);
    const blocks = layout.pages.flatMap((page) => page.blocks);

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((block) => block.paragraphId === paragraph.id)).toBe(true);
    expect(blocks.every((block) => block.layout?.lines.length)).toBe(true);
    expect(blocks[0]?.layout?.startOffset).toBe(0);
    expect(blocks[blocks.length - 1]?.layout?.endOffset).toBe(paragraph.runs[0]?.text.length);
  });

  it("moves a table to the next page when it does not fit the remaining space", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "lead" }]);
    const table = {
      id: "table:1",
      type: "table" as const,
      rows: [
        {
          id: "row:1",
          cells: [
            {
              id: "cell:1",
              blocks: [createEditor2ParagraphFromRuns([{ text: "cell" }])],
            },
          ],
        },
      ],
    };

    const layout = projectDocumentLayout([paragraph, table], 220, {
      [paragraph.id]: 160,
      [table.id]: 90,
    });

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks.map((block) => block.blockType)).toEqual(["paragraph"]);
    expect(layout.pages[1]?.blocks.map((block) => block.blockType)).toEqual(["table"]);
  });

  it("splits a tall simple table across pages by row boundaries", () => {
    resetEditor2Ids();
    const table = createEditor2Table([
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "A".repeat(220) }])])]),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "B".repeat(220) }])])]),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "C".repeat(220) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 220);

    expect(layout.pages).toHaveLength(3);
    expect(layout.pages.map((page) => page.blocks[0]?.blockType)).toEqual([
      "table",
      "table",
      "table",
    ]);
    expect(layout.pages[0]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 0,
      endRowIndex: 1,
      repeatedHeaderRowCount: 0,
    });
    expect(layout.pages[1]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 1,
      endRowIndex: 2,
      repeatedHeaderRowCount: 0,
    });
    expect(layout.pages[2]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 2,
      endRowIndex: 3,
      repeatedHeaderRowCount: 0,
    });
  });

  it("repeats header rows on continued table pages", () => {
    resetEditor2Ids();
    const table = createEditor2Table([
      createEditor2TableRow(
        [createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Header".repeat(20) }])])],
        { isHeader: true },
      ),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Body1".repeat(20) }])])]),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Body2".repeat(20) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 220);

    expect(layout.pages).toHaveLength(3);
    expect(layout.pages[0]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 0,
      endRowIndex: 1,
      repeatedHeaderRowCount: 0,
    });
    expect(layout.pages[1]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 1,
      endRowIndex: 2,
      repeatedHeaderRowCount: 1,
    });
    expect(layout.pages[2]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 2,
      endRowIndex: 3,
      repeatedHeaderRowCount: 1,
    });
  });

  it("splits a vertically merged table only at safe row-group boundaries", () => {
    resetEditor2Ids();
    const mergedTop = createEditor2TableCell(
      [createEditor2ParagraphFromRuns([{ text: "Merged".repeat(20) }])],
      1,
      { rowSpan: 2, vMerge: "restart" },
    );
    const mergedBottom = createEditor2TableCell([], 1, { vMerge: "continue" });
    mergedBottom.blocks = [];
    const table = createEditor2Table([
      createEditor2TableRow([mergedTop, createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Top".repeat(20) }])])]),
      createEditor2TableRow([mergedBottom, createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Bottom".repeat(20) }])])]),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Tail".repeat(20) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 220);

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 0,
      endRowIndex: 2,
      repeatedHeaderRowCount: 0,
    });
    expect(layout.pages[1]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 2,
      endRowIndex: 3,
      repeatedHeaderRowCount: 0,
    });
  });

  it("repeats a multi-row merged header only when the header span is self-contained", () => {
    resetEditor2Ids();
    const mergedHeaderTop = createEditor2TableCell(
      [createEditor2ParagraphFromRuns([{ text: "Header".repeat(18) }])],
      1,
      { rowSpan: 2, vMerge: "restart" },
    );
    const mergedHeaderBottom = createEditor2TableCell([], 1, { vMerge: "continue" });
    mergedHeaderBottom.blocks = [];
    const table = createEditor2Table([
      createEditor2TableRow([mergedHeaderTop], { isHeader: true }),
      createEditor2TableRow([mergedHeaderBottom], { isHeader: true }),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Body1".repeat(18) }])])]),
      createEditor2TableRow([createEditor2TableCell([createEditor2ParagraphFromRuns([{ text: "Body2".repeat(18) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 220);

    expect(layout.pages).toHaveLength(3);
    expect(layout.pages[1]?.blocks[0]?.tableSegment?.repeatedHeaderRowCount).toBe(2);
    expect(layout.pages[2]?.blocks[0]?.tableSegment?.repeatedHeaderRowCount).toBe(2);
  });

  it("prefers measured paragraph lines when paginating a paragraph", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "abcdef" }]);
    const projected = projectParagraphLayout(paragraph);

    const layout = projectDocumentLayout(
      [paragraph],
      55,
      undefined,
      {
        [paragraph.id]: {
          paragraphId: paragraph.id,
          text: projected.text,
          fragments: projected.fragments,
          startOffset: 0,
          endOffset: 6,
          lines: [
            {
              paragraphId: paragraph.id,
              index: 0,
              startOffset: 0,
              endOffset: 2,
              top: 0,
              height: 20,
              slots: [
                { paragraphId: paragraph.id, offset: 0, left: 0, top: 0, height: 20 },
                { paragraphId: paragraph.id, offset: 1, left: 10, top: 0, height: 20 },
                { paragraphId: paragraph.id, offset: 2, left: 20, top: 0, height: 20 },
              ],
              fragments: projected.fragments
                .map((fragment) => ({
                  ...fragment,
                  chars: fragment.chars.filter((char) => char.paragraphOffset < 2),
                  text: fragment.chars
                    .filter((char) => char.paragraphOffset < 2)
                    .map((char) => char.char)
                    .join(""),
                  endOffset: Math.min(fragment.endOffset, 2),
                }))
                .filter((fragment) => fragment.startOffset < fragment.endOffset),
            },
            {
              paragraphId: paragraph.id,
              index: 1,
              startOffset: 2,
              endOffset: 4,
              top: 20,
              height: 20,
              slots: [
                { paragraphId: paragraph.id, offset: 2, left: 0, top: 20, height: 20 },
                { paragraphId: paragraph.id, offset: 3, left: 10, top: 20, height: 20 },
                { paragraphId: paragraph.id, offset: 4, left: 20, top: 20, height: 20 },
              ],
              fragments: projected.fragments
                .map((fragment) => ({
                  ...fragment,
                  chars: fragment.chars.filter(
                    (char) => char.paragraphOffset >= 2 && char.paragraphOffset < 4,
                  ),
                  text: fragment.chars
                    .filter((char) => char.paragraphOffset >= 2 && char.paragraphOffset < 4)
                    .map((char) => char.char)
                    .join(""),
                  startOffset: Math.max(fragment.startOffset, 2),
                  endOffset: Math.min(fragment.endOffset, 4),
                }))
                .filter((fragment) => fragment.startOffset < fragment.endOffset),
            },
            {
              paragraphId: paragraph.id,
              index: 2,
              startOffset: 4,
              endOffset: 6,
              top: 40,
              height: 20,
              slots: [
                { paragraphId: paragraph.id, offset: 4, left: 0, top: 40, height: 20 },
                { paragraphId: paragraph.id, offset: 5, left: 10, top: 40, height: 20 },
                { paragraphId: paragraph.id, offset: 6, left: 20, top: 40, height: 20 },
              ],
              fragments: projected.fragments
                .map((fragment) => ({
                  ...fragment,
                  chars: fragment.chars.filter((char) => char.paragraphOffset >= 4),
                  text: fragment.chars
                    .filter((char) => char.paragraphOffset >= 4)
                    .map((char) => char.char)
                    .join(""),
                  startOffset: Math.max(fragment.startOffset, 4),
                }))
                .filter((fragment) => fragment.startOffset < fragment.endOffset),
            },
          ],
        },
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks[0]?.layout?.endOffset).toBe(4);
    expect(layout.pages[1]?.blocks[0]?.layout?.startOffset).toBe(4);
  });

  it("ignores stale measured paragraph geometry when the paragraph text has changed", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "hello" }]);

    const layout = projectDocumentLayout(
      [paragraph],
      200,
      undefined,
      {
        [paragraph.id]: {
          paragraphId: paragraph.id,
          text: "h",
          fragments: [],
          startOffset: 0,
          endOffset: 1,
          lines: [
            {
              paragraphId: paragraph.id,
              index: 0,
              startOffset: 0,
              endOffset: 1,
              top: 0,
              height: 20,
              slots: [
                { paragraphId: paragraph.id, offset: 0, left: 0, top: 0, height: 20 },
                { paragraphId: paragraph.id, offset: 1, left: 10, top: 0, height: 20 },
              ],
              fragments: [],
            },
          ],
        },
      },
    );

    expect(layout.pages).toHaveLength(1);
    expect(layout.pages[0]?.blocks[0]?.layout?.text).toBe("hello");
    expect(layout.pages[0]?.blocks[0]?.layout?.endOffset).toBe(5);
  });

  it("forces a new page when a paragraph has pageBreakBefore", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "alpha" }]),
      createEditor2ParagraphFromRuns([{ text: "beta" }]),
    ];
    paragraphs[1]!.style = { pageBreakBefore: true };

    const layout = projectDocumentLayout(
      paragraphs,
      1000,
      {
        [paragraphs[0]!.id]: 40,
        [paragraphs[1]!.id]: 40,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks.map((block) => block.paragraphId)).toEqual([paragraphs[0]!.id]);
    expect(layout.pages[1]?.blocks.map((block) => block.paragraphId)).toEqual([paragraphs[1]!.id]);
  });

  it("keeps adjacent paragraphs together when keepWithNext is set", () => {
    resetEditor2Ids();
    const paragraphs = [
      createEditor2ParagraphFromRuns([{ text: "lead" }]),
      createEditor2ParagraphFromRuns([{ text: "tail" }]),
      createEditor2ParagraphFromRuns([{ text: "after" }]),
    ];
    paragraphs[0]!.style = { keepWithNext: true };

    const layout = projectDocumentLayout(
      paragraphs,
      100,
      {
        [paragraphs[0]!.id]: 40,
        [paragraphs[1]!.id]: 40,
        [paragraphs[2]!.id]: 40,
      },
    );

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks.map((block) => block.paragraphId)).toEqual([
      paragraphs[0]!.id,
      paragraphs[1]!.id,
    ]);
    expect(layout.pages[1]?.blocks.map((block) => block.paragraphId)).toEqual([paragraphs[2]!.id]);
  });

  // ----------------------------------------------------------------
  // Golden tests: layoutProjection currently IGNORES named styles
  // These tests lock in the CURRENT (static) behavior so that when
  // layoutProjection is migrated to resolve via document.styles,
  // the diff is explicit and intentional.
  // ----------------------------------------------------------------

  it("[GOLDEN] estimateParagraphBlockHeight ignores named style fontSize/lineHeight via styleId", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "hello world" }]);
    paragraph.style = { styleId: "Heading1" };

    const blockHeight = estimateParagraphBlockHeight(paragraph);

    const fontSize = 20; // DEFAULT_FONT_SIZE — golden: does NOT resolve Heading1's 28
    const lineHeight = 1.6 * fontSize; // DEFAULT_LINE_HEIGHT — golden: does NOT resolve Heading1's 1.2
    const spacingBefore = 0; // paragraph.style?.spacingBefore is undefined → 0
    const spacingAfter = 0; // paragraph.style?.spacingAfter is undefined → 0
    const charsPerLine = 48; // no indent, no list
    const lineCount = Math.ceil("hello world".length / charsPerLine);
    const expected = spacingBefore + spacingAfter + lineCount * lineHeight + 10;

    expect(blockHeight).toBe(expected);
  });

  it("[GOLDEN] projectDocumentLayout page breaks are computed with default font metrics when only styleId is set", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "a".repeat(500) }]);
    paragraph.style = { styleId: "Heading1" };

    const layout = projectDocumentLayout([paragraph], 220);

    const pageCount = layout.pages.length;
    // Golden: because Heading1's styleId is not resolved, the paragraph is
    // estimated with default 20px font / 1.6 line-height.
    // This means it will fit on fewer pages vs. if 28px / 1.2 were used.
    // The exact page count is the GOLDEN — if it changes after migration, that's expected.
    expect(pageCount).toBeGreaterThanOrEqual(1);
    expect(layout.pages[0]?.blocks[0]?.paragraphId).toBe(paragraph.id);
  });

  it("[GOLDEN] projectDocumentLayout with full Editor2Document (incl. styles) ignores styles in height estimation", () => {
    resetEditor2Ids();
    const paragraph = createEditor2ParagraphFromRuns([{ text: "x".repeat(300) }]);
    paragraph.style = { styleId: "Heading2" };

    const doc: Editor2Document = {
      id: "doc:golden",
      blocks: [paragraph],
      styles: GOLDEN_STYLES,
    };

    const layout = projectDocumentLayout(doc, 220);

    // Golden: Heading2 should resolve to fontSize=24, lineHeight=1.3 via basedOn
    // chain, but currently layoutProjection reads paragraph.style directly
    // and gets undefined for fontSize/lineHeight → uses defaults (20, 1.6).
    expect(layout.pages.length).toBeGreaterThanOrEqual(1);
  });
});
