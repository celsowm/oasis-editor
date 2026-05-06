import { describe, expect, it } from "vitest";
import {
  createEditorParagraphFromRuns,
  createEditorTable,
  createEditorTableCell,
  createEditorTableRow,
  resetEditorIds,
} from "../../core/editorState.js";
import type {
  EditorDocument,
  EditorNamedStyle,
} from "../../core/model.js";
import {
  projectDocumentLayout,
  measureParagraphLayoutFromRects,
  projectParagraphLayout,
  resolveClosestOffsetInMeasuredLayout,
  estimateParagraphBlockHeight,
} from "../../ui/layoutProjection.js";

const GOLDEN_STYLES: Record<string, EditorNamedStyle> = {
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
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([
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
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([
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
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([
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
    resetEditorIds();
    const paragraphs = [
      createEditorParagraphFromRuns([{ text: "a".repeat(240) }]),
      createEditorParagraphFromRuns([{ text: "b".repeat(240) }]),
      createEditorParagraphFromRuns([{ text: "c".repeat(240) }]),
    ];

    const layout = projectDocumentLayout(paragraphs, 140);

    expect(layout.pages.length).toBeGreaterThan(1);
    const paragraphIds = layout.pages.flatMap((page) => page.blocks.map((block) => block.paragraphId));
    expect(new Set(paragraphIds)).toEqual(new Set(paragraphs.map((paragraph) => paragraph.id)));
    expect(paragraphIds.length).toBeGreaterThanOrEqual(paragraphs.length);
  });

  it("prefers measured block heights over estimated ones for page projection", () => {
    resetEditorIds();
    const paragraphs = [
      createEditorParagraphFromRuns([{ text: "short" }]),
      createEditorParagraphFromRuns([{ text: "short" }]),
    ];

    const layout = projectDocumentLayout(
      paragraphs,
      90,
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
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "x".repeat(520) }]);

    const layout = projectDocumentLayout([paragraph], 90);
    const blocks = layout.pages.flatMap((page) => page.blocks);

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((block) => block.paragraphId === paragraph.id)).toBe(true);
    expect(blocks.every((block) => block.layout?.lines.length)).toBe(true);
    expect(blocks[0]?.layout?.startOffset).toBe(0);
    expect(blocks[blocks.length - 1]?.layout?.endOffset).toBe(paragraph.runs[0]?.text.length);
  });

  it("moves a table to the next page when it does not fit the remaining space", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "lead" }]);
    const table = {
      id: "table:1",
      type: "table" as const,
      rows: [
        {
          id: "row:1",
          cells: [
            {
              id: "cell:1",
              blocks: [createEditorParagraphFromRuns([{ text: "cell" }])],
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
    resetEditorIds();
    const table = createEditorTable([
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "A".repeat(220) }])])]),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "B".repeat(220) }])])]),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "C".repeat(220) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 150);

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
    resetEditorIds();
    const table = createEditorTable([
      createEditorTableRow(
        [createEditorTableCell([createEditorParagraphFromRuns([{ text: "Header".repeat(20) }])])],
        { isHeader: true },
      ),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "Body1".repeat(20) }])])]),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "Body2".repeat(20) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 120);

    expect(layout.pages).toHaveLength(2);
    expect(layout.pages[0]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 0,
      endRowIndex: 2,
      repeatedHeaderRowCount: 0,
    });
    expect(layout.pages[1]?.blocks[0]?.tableSegment).toEqual({
      startRowIndex: 2,
      endRowIndex: 3,
      repeatedHeaderRowCount: 1,
    });
  });

  it("splits a vertically merged table only at safe row-group boundaries", () => {
    resetEditorIds();
    const mergedTop = createEditorTableCell(
      [createEditorParagraphFromRuns([{ text: "Merged".repeat(20) }])],
      1,
      { rowSpan: 2, vMerge: "restart" },
    );
    const mergedBottom = createEditorTableCell([], 1, { vMerge: "continue" });
    mergedBottom.blocks = [];
    const table = createEditorTable([
      createEditorTableRow([mergedTop, createEditorTableCell([createEditorParagraphFromRuns([{ text: "Top".repeat(20) }])])]),
      createEditorTableRow([mergedBottom, createEditorTableCell([createEditorParagraphFromRuns([{ text: "Bottom".repeat(20) }])])]),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "Tail".repeat(20) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 120);

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
    resetEditorIds();
    const mergedHeaderTop = createEditorTableCell(
      [createEditorParagraphFromRuns([{ text: "Header".repeat(18) }])],
      1,
      { rowSpan: 2, vMerge: "restart" },
    );
    const mergedHeaderBottom = createEditorTableCell([], 1, { vMerge: "continue" });
    mergedHeaderBottom.blocks = [];
    const table = createEditorTable([
      createEditorTableRow([mergedHeaderTop], { isHeader: true }),
      createEditorTableRow([mergedHeaderBottom], { isHeader: true }),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "Body1".repeat(18) }])])]),
      createEditorTableRow([createEditorTableCell([createEditorParagraphFromRuns([{ text: "Body2".repeat(18) }])])]),
    ]);

    const layout = projectDocumentLayout([table], 120);

    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
    expect(
      layout.pages
        .slice(1)
        .every((page) => page.blocks[0]?.tableSegment?.repeatedHeaderRowCount === 2),
    ).toBe(true);
  });

  it("prefers measured paragraph lines when paginating a paragraph", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "abcdef" }]);
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
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "hello" }]);

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
    resetEditorIds();
    const paragraphs = [
      createEditorParagraphFromRuns([{ text: "alpha" }]),
      createEditorParagraphFromRuns([{ text: "beta" }]),
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
    resetEditorIds();
    const paragraphs = [
      createEditorParagraphFromRuns([{ text: "lead" }]),
      createEditorParagraphFromRuns([{ text: "tail" }]),
      createEditorParagraphFromRuns([{ text: "after" }]),
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

  it("resolves named paragraph styles when estimating paragraph block height", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "hello world" }]);
    paragraph.style = { styleId: "Heading1" };

    const blockHeight = estimateParagraphBlockHeight(paragraph, GOLDEN_STYLES);

    const fontSize = 28;
    const lineHeight = 1.2 * fontSize;
    const spacingBefore = 24;
    const spacingAfter = 12;
    const charsPerLine = 48; // no indent, no list
    const lineCount = Math.ceil("hello world".length / charsPerLine);
    const expected = spacingBefore + spacingAfter + lineCount * lineHeight;

    expect(blockHeight).toBeCloseTo(expected, 5);
  });

  it("estimates paragraph height from effective Word-like spacing only, without synthetic gap", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "Word" }]);

    expect(estimateParagraphBlockHeight(paragraph)).toBeCloseTo(25.25, 5);
  });

  it("uses explicit spacingAfter without adding hidden extra paragraph gap", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "Word" }]);
    paragraph.style = { spacingAfter: 0, lineHeight: 1 };

    expect(estimateParagraphBlockHeight(paragraph)).toBeCloseTo(15, 5);
  });

  it("uses named paragraph styles when computing pagination from document styles", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "a".repeat(500) }]);
    paragraph.style = { styleId: "Heading1" };

    const defaultLayout = projectDocumentLayout(
      {
        id: "doc:unstyled",
        blocks: [paragraph],
      },
      220,
    );
    const styledLayout = projectDocumentLayout(
      {
        id: "doc:styled",
        blocks: [paragraph],
        styles: GOLDEN_STYLES,
      },
      220,
    );

    expect(styledLayout.pages.length).toBeGreaterThan(defaultLayout.pages.length);
    expect(styledLayout.pages[0]?.blocks[0]?.paragraphId).toBe(paragraph.id);
  });

  it("resolves basedOn chains from document styles during height estimation", () => {
    resetEditorIds();
    const paragraph = createEditorParagraphFromRuns([{ text: "x".repeat(300) }]);
    paragraph.style = { styleId: "Heading2" };

    const doc: EditorDocument = {
      id: "doc:golden",
      blocks: [paragraph],
      styles: GOLDEN_STYLES,
    };

    const layout = projectDocumentLayout(doc, 140);

    expect(layout.pages.length).toBeGreaterThanOrEqual(2);
  });
});
