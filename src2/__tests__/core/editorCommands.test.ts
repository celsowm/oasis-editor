import { describe, expect, it, beforeEach } from "vitest";
import { getParagraphLength, getParagraphText, getParagraphs, paragraphOffsetToPosition, positionToParagraphOffset } from "../../core/model.js";
import {
  deleteBackward,
  deleteForward,
  extendSelectionLeft,
  extendSelectionRight,
  getLinkAtSelection,
  getSelectedText,
  insertPlainTextAtSelection,
  insertTextAtSelection,
  insertImageAtSelection,
  insertTableAtSelection,
  moveSelectionDown,
  moveSelectionLeft,
  moveSelectionRight,
  moveSelectionUp,
  moveSelectedImageToPosition,
  resizeSelectedImage,
  setLinkAtSelection,
  setParagraphStyle,
  setTextStyleValue,
  splitBlockAtSelection,
  toggleParagraphList,
  toggleTextStyle,
} from "../../core/editorCommands.js";
import {
  createEditor2StateFromParagraphRuns,
  createEditor2StateFromTexts,
  resetEditor2Ids,
  createEditor2Document,
  createEditor2Paragraph,
  createEditor2Table,
  createEditor2TableCell,
  createEditor2TableRow,
  createEditor2StateFromDocument,
} from "../../core/editorState.js";

describe("editor-2 commands", () => {
  beforeEach(() => {
    resetEditor2Ids();
  });

  const paragraphTexts = (state: Parameters<typeof getParagraphs>[0]) =>
    getParagraphs(state).map((paragraph) => getParagraphText(paragraph));

  it("inserts text into the current block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = insertTextAtSelection(state, "X");

    expect(paragraphTexts(next)).toEqual(["heXllo"]);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("splits the current block on enter", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = splitBlockAtSelection(state);

    expect(paragraphTexts(next)).toEqual(["he", "llo"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[1].id);
    expect(next.selection.focus.offset).toBe(0);
  });

  it("deletes one character backward inside a block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 3 });
    const next = deleteBackward(state);

    expect(paragraphTexts(next)).toEqual(["helo"]);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("merges with the previous block when backspacing at block start", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], { blockIndex: 1, offset: 0 });
    const next = deleteBackward(state);

    expect(paragraphTexts(next)).toEqual(["abcdef"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[0].id);
    expect(next.selection.focus.offset).toBe(3);
  });

  it("moves left and right across block boundaries", () => {
    const start = createEditor2StateFromTexts(["ab", "cd"], { blockIndex: 1, offset: 0 });
    const left = moveSelectionLeft(start);
    const right = moveSelectionRight(left);

    expect(left.selection.focus.paragraphId).toBe(getParagraphs(left)[0].id);
    expect(left.selection.focus.offset).toBe(2);
    expect(right.selection.focus.paragraphId).toBe(getParagraphs(right)[1].id);
    expect(right.selection.focus.offset).toBe(0);
  });

  it("moves up and down with clamped offsets", () => {
    const start = createEditor2StateFromTexts(["abcd", "xy"], { blockIndex: 0, offset: 3 });
    const down = moveSelectionDown(start);
    const up = moveSelectionUp(down);

    expect(down.selection.focus.paragraphId).toBe(getParagraphs(down)[1].id);
    expect(down.selection.focus.offset).toBe(2);
    expect(up.selection.focus.paragraphId).toBe(getParagraphs(up)[0].id);
    expect(up.selection.focus.offset).toBe(2);
  });

  it("replaces an expanded selection when inserting text", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });
    const next = insertTextAtSelection(state, "X");

    expect(paragraphTexts(next)).toEqual(["hXo"]);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("deletes an expanded cross-block selection with backspace", () => {
    const state = createEditor2StateFromTexts(["abc", "def", "ghi"], {
      anchor: { blockIndex: 0, offset: 2 },
      focus: { blockIndex: 2, offset: 1 },
    });
    const next = deleteBackward(state);

    expect(paragraphTexts(next)).toEqual(["abhi"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[0].id);
    expect(next.selection.focus.offset).toBe(2);
  });

  it("extends selection left and right from the focus", () => {
    const start = createEditor2StateFromTexts(["abcd"], { blockIndex: 0, offset: 2 });
    const left = extendSelectionLeft(start);
    const right = extendSelectionRight(left);

    expect(left.selection.anchor.offset).toBe(2);
    expect(left.selection.focus.offset).toBe(1);
    expect(right.selection.anchor.offset).toBe(2);
    expect(right.selection.focus.offset).toBe(2);
  });

  it("deletes one character forward inside a block", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 1 });
    const next = deleteForward(state);

    expect(paragraphTexts(next)).toEqual(["hllo"]);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("deletes an expanded selection with delete", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 1, offset: 2 },
    });
    const next = deleteForward(state);

    expect(paragraphTexts(next)).toEqual(["af"]);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("extracts selected text across blocks with newlines", () => {
    const state = createEditor2StateFromTexts(["abc", "def", "ghi"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 2, offset: 2 },
    });

    expect(getSelectedText(state)).toBe("bc\ndef\ngh");
  });

  it("pastes plain text with newlines as multiple blocks", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const next = insertPlainTextAtSelection(state, "A\nB");

    expect(paragraphTexts(next)).toEqual(["heA", "Bllo"]);
    expect(next.selection.focus.paragraphId).toBe(getParagraphs(next)[1].id);
    expect(next.selection.focus.offset).toBe(1);
  });

  it("preserves surrounding runs when inserting inside a multi-run paragraph", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "he", styles: { bold: true } },
          { text: "llo", styles: { italic: true } },
        ],
      ],
      { blockIndex: 0, offset: 2 },
    );
    const next = insertTextAtSelection(state, "X");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["heX", "llo"]);
    expect(paragraph.runs[0]?.styles).toEqual({ bold: true });
    expect(paragraph.runs[1]?.styles).toEqual({ italic: true });
  });

  it("preserves multi-run fragments when deleting across run boundaries", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "ab", styles: { bold: true } },
          { text: "cd", styles: { italic: true } },
          { text: "ef", styles: { underline: true } },
        ],
      ],
      {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 0, offset: 5 },
      },
    );
    const next = deleteBackward(state);
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["a", "f"]);
    expect(paragraph.runs[0]?.styles).toEqual({ bold: true });
    expect(paragraph.runs[1]?.styles).toEqual({ underline: true });
  });

  it("splits a multi-run paragraph without flattening the tail runs", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "ab", styles: { bold: true } },
          { text: "cd", styles: { italic: true } },
        ],
      ],
      { blockIndex: 0, offset: 3 },
    );
    const next = splitBlockAtSelection(state);
    const [firstParagraph, secondParagraph] = getParagraphs(next);

    expect(firstParagraph.runs.map((run) => run.text)).toEqual(["ab", "c"]);
    expect(firstParagraph.runs.map((run) => run.styles)).toEqual([{ bold: true }, { italic: true }]);
    expect(secondParagraph.runs.map((run) => run.text)).toEqual(["d"]);
    expect(secondParagraph.runs[0]?.styles).toEqual({ italic: true });
  });

  it("toggles bold on an expanded selection by splitting runs", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });
    const next = toggleTextStyle(state, "bold");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([undefined, { bold: true }, undefined]);
  });

  it("removes underline when the full selected range is already underlined", () => {
    const state = createEditor2StateFromParagraphRuns(
      [[{ text: "hello", styles: { underline: true } }]],
      {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 0, offset: 4 },
      },
    );
    const next = toggleTextStyle(state, "underline");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([{ underline: true }, undefined, { underline: true }]);
  });

  it("applies font family to the selected range without flattening neighbors", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });
    const next = setTextStyleValue(state, "fontFamily", "Georgia");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([undefined, { fontFamily: "Georgia" }, undefined]);
  });

  it("applies font size and color across existing styled runs", () => {
    const state = createEditor2StateFromParagraphRuns(
      [
        [
          { text: "ab", styles: { bold: true } },
          { text: "cd", styles: { italic: true } },
        ],
      ],
      {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 0, offset: 3 },
      },
    );
    const withFontSize = setTextStyleValue(state, "fontSize", 22);
    const next = setTextStyleValue(withFontSize, "color", "#224466");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["a", "b", "c", "d"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([
      { bold: true },
      { bold: true, fontSize: 22, color: "#224466" },
      { italic: true, fontSize: 22, color: "#224466" },
      { italic: true },
    ]);
  });

  it("removes highlight from the selected range when value is null", () => {
    const state = createEditor2StateFromParagraphRuns(
      [[{ text: "hello", styles: { highlight: "#ffee00" } }]],
      {
        anchor: { blockIndex: 0, offset: 1 },
        focus: { blockIndex: 0, offset: 4 },
      },
    );
    const next = setTextStyleValue(state, "highlight", null);
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([{ highlight: "#ffee00" }, undefined, { highlight: "#ffee00" }]);
  });

  it("applies a link to the selected text range", () => {
    const state = createEditor2StateFromTexts(["hello"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 0, offset: 4 },
    });

    const next = setTextStyleValue(state, "link", "https://example.com");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["h", "ell", "o"]);
    expect(paragraph.runs.map((run) => run.styles)).toEqual([
      undefined,
      { link: "https://example.com" },
      undefined,
    ]);
  });

  it("removes a link from a collapsed caret inside an existing linked range", () => {
    const state = createEditor2StateFromParagraphRuns(
      [[{ text: "hello", styles: { link: "https://example.com" } }]],
      { blockIndex: 0, offset: 2 },
    );

    const next = setLinkAtSelection(state, null);
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs.map((run) => run.text)).toEqual(["hello"]);
    expect(paragraph.runs[0]?.styles).toBeUndefined();
  });

  it("edits the current link when the caret is collapsed inside a linked run", () => {
    const state = createEditor2StateFromParagraphRuns(
      [[{ text: "hello", styles: { link: "https://old.example" } }]],
      { blockIndex: 0, offset: 3 },
    );

    const next = setLinkAtSelection(state, "https://new.example");
    const paragraph = getParagraphs(next)[0];

    expect(paragraph.runs[0]?.styles).toEqual({ link: "https://new.example" });
    expect(getLinkAtSelection(next)).toBe("https://new.example");
  });

  it("applies paragraph alignment across the selected paragraph range", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], {
      anchor: { blockIndex: 0, offset: 1 },
      focus: { blockIndex: 1, offset: 2 },
    });
    const next = setParagraphStyle(state, "align", "center");

    expect(getParagraphs(next).map((paragraph) => paragraph.style)).toEqual([
      { align: "center" },
      { align: "center" },
    ]);
  });

  it("applies paragraph indentation on a collapsed selection to the focused paragraph", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], { blockIndex: 1, offset: 1 });
    const next = setParagraphStyle(state, "indentLeft", 36);

    expect(getParagraphs(next)[0]?.style).toBeUndefined();
    expect(getParagraphs(next)[1]?.style).toEqual({ indentLeft: 36 });
  });

  it("removes paragraph spacing when the style value is null", () => {
    const state = createEditor2StateFromTexts(["abc"], { blockIndex: 0, offset: 1 });
    const withSpacing = setParagraphStyle(state, "spacingAfter", 18);
    const next = setParagraphStyle(withSpacing, "spacingAfter", null);

    expect(getParagraphs(next)[0]?.style).toBeUndefined();
  });

  it("toggles bullet list on the selected paragraph range", () => {
    const state = createEditor2StateFromTexts(["abc", "def"], {
      anchor: { blockIndex: 0, offset: 0 },
      focus: { blockIndex: 1, offset: 1 },
    });
    const next = toggleParagraphList(state, "bullet");

    expect(getParagraphs(next).map((paragraph) => paragraph.list)).toEqual([
      { kind: "bullet", level: 0 },
      { kind: "bullet", level: 0 },
    ]);
  });

  it("clears ordered list when the whole targeted range is already ordered", () => {
    const state = toggleParagraphList(
      createEditor2StateFromTexts(["abc", "def"], {
        anchor: { blockIndex: 0, offset: 0 },
        focus: { blockIndex: 1, offset: 1 },
      }),
      "ordered",
    );
    const next = toggleParagraphList(state, "ordered");

    expect(getParagraphs(next).map((paragraph) => paragraph.list)).toEqual([undefined, undefined]);
  });

  it("preserves table structure when applying text styles", () => {
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2Paragraph("Cell A")]),
        createEditor2TableCell([createEditor2Paragraph("Cell B")]),
      ]),
    ]);
    const document = createEditor2Document([table]);
    const state = toggleTextStyle(
      createEditor2StateFromDocument(document, { paragraphIndex: 0, offset: 2 }),
      "bold"
    );

    // Table structure must survive the command even with collapsed selection
    expect(state.document.blocks.length).toBe(1);
    expect(state.document.blocks[0]?.type).toBe("table");

    const tableBlock = state.document.blocks[0] as any;
    // Second cell must be untouched regardless of what happens in first cell
    expect(tableBlock.rows[0].cells[1].blocks[0].runs[0].text).toBe("Cell B");
  });

  it("preserves table structure when moving selection left and right", () => {
    const table = createEditor2Table([
      createEditor2TableRow([
        createEditor2TableCell([createEditor2Paragraph("A")]),
        createEditor2TableCell([createEditor2Paragraph("B")]),
      ]),
    ]);
    const state = createEditor2StateFromDocument(createEditor2Document([table]), { paragraphIndex: 1, offset: 0 });
    const left = moveSelectionLeft(state);
    
    expect(left.document.blocks[0]?.type).toBe("table");
    expect(left.selection.focus.paragraphId).toBe(getParagraphs(left)[0]?.id);
    
    const right = moveSelectionRight(left);
    expect(right.document.blocks[0]?.type).toBe("table");
    expect(right.selection.focus.paragraphId).toBe(getParagraphs(right)[1]?.id);
  });

  // ── insertImageAtSelection ─────────────────────────────────────────────────

  it("inserts an image run with the OBJECT REPLACEMENT CHAR at the cursor", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 2 });
    const image = { src: "data:image/png;base64,abc", width: 100, height: 50 };
    const next = insertImageAtSelection(state, image);

    const paragraph = getParagraphs(next)[0];
    // The combined text should have the object replacement char inserted at offset 2
    expect(getParagraphText(paragraph)).toBe("he\uFFFCllo");
    // The run that holds the image should carry image metadata
    const imageRun = paragraph.runs.find((run) => run.image !== undefined);
    expect(imageRun).toBeDefined();
    expect(imageRun?.text).toBe("\uFFFC");
    expect(imageRun?.image?.src).toBe("data:image/png;base64,abc");
    expect(imageRun?.image?.width).toBe(100);
    expect(imageRun?.image?.height).toBe(50);
    // Cursor should advance by 1 past the image (paragraph-level offset = 3)
    const imageResultParagraph = getParagraphs(next)[0]!;
    expect(positionToParagraphOffset(imageResultParagraph, next.selection.focus)).toBe(3);
  });

  it("inserts an image at the beginning of an empty paragraph", () => {
    const state = createEditor2StateFromTexts([""], { blockIndex: 0, offset: 0 });
    const image = { src: "data:image/gif;base64,xyz", width: 32, height: 32 };
    const next = insertImageAtSelection(state, image);

    const paragraph = getParagraphs(next)[0];
    expect(getParagraphText(paragraph)).toBe("\uFFFC");
    expect(paragraph.runs[0]?.image?.src).toBe("data:image/gif;base64,xyz");
  });

  it("replaces a selection with an image run", () => {
    const state = createEditor2StateFromTexts(["abc"], {
      anchor: { blockIndex: 0, offset: 0 },
      focus: { blockIndex: 0, offset: 3 },
    });
    const image = { src: "data:image/png;base64,img", width: 200, height: 100 };
    const next = insertImageAtSelection(state, image);

    expect(getParagraphText(getParagraphs(next)[0])).toBe("\uFFFC");
  });

  it("resizes the currently selected image object", () => {
    const inserted = insertImageAtSelection(
      createEditor2StateFromTexts([""], { blockIndex: 0, offset: 0 }),
      { src: "data:image/png;base64,abc", width: 100, height: 50 },
    );
    const paragraph = getParagraphs(inserted)[0]!;
    const selected = {
      ...inserted,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 0),
        focus: paragraphOffsetToPosition(paragraph, 1),
      },
    };
    const resized = resizeSelectedImage(selected, 180, 90);
    const imageRun = getParagraphs(resized)[0]!.runs.find((run) => run.image);

    expect(imageRun?.image?.width).toBe(180);
    expect(imageRun?.image?.height).toBe(90);
  });

  it("moves a selected image to another paragraph position", () => {
    const source = createEditor2StateFromTexts(["a", "b"], { blockIndex: 0, offset: 1 });
    const withImage = insertImageAtSelection(source, {
      src: "data:image/png;base64,abc",
      width: 100,
      height: 50,
    });
    const paragraphs = getParagraphs(withImage);
    const imageParagraph = paragraphs[0]!;
    const targetParagraph = paragraphs[1]!;
    const selected = {
      ...withImage,
      selection: {
        anchor: paragraphOffsetToPosition(imageParagraph, 1),
        focus: paragraphOffsetToPosition(imageParagraph, 2),
      },
    };

    const moved = moveSelectedImageToPosition(
      selected,
      paragraphOffsetToPosition(targetParagraph, 0),
    );

    expect(getParagraphText(getParagraphs(moved)[0]!)).toBe("a");
    expect(getParagraphText(getParagraphs(moved)[1]!)).toBe("\uFFFCb");
    expect(positionToParagraphOffset(getParagraphs(moved)[1]!, moved.selection.focus)).toBe(1);
  });

  it("moves a selected image to the previous paragraph position", () => {
    const source = createEditor2StateFromTexts(["a", ""], { blockIndex: 1, offset: 0 });
    const withImage = insertImageAtSelection(source, {
      src: "data:image/png;base64,abc",
      width: 100,
      height: 50,
    });
    const paragraphs = getParagraphs(withImage);
    const imageParagraph = paragraphs[1]!;
    const targetParagraph = paragraphs[0]!;
    const selected = {
      ...withImage,
      selection: {
        anchor: paragraphOffsetToPosition(imageParagraph, 0),
        focus: paragraphOffsetToPosition(imageParagraph, 1),
      },
    };

    const moved = moveSelectedImageToPosition(
      selected,
      paragraphOffsetToPosition(targetParagraph, getParagraphLength(targetParagraph)),
    );

    expect(getParagraphText(getParagraphs(moved)[0]!)).toBe("a\uFFFC");
    expect(getParagraphText(getParagraphs(moved)[1]!)).toBe("");
    expect(positionToParagraphOffset(getParagraphs(moved)[0]!, moved.selection.focus)).toBe(2);
  });

  it("ignores resizeSelectedImage when the selection is not exactly one image object", () => {
    const state = createEditor2StateFromTexts(["abc"], {
      anchor: { blockIndex: 0, offset: 0 },
      focus: { blockIndex: 0, offset: 2 },
    });

    expect(resizeSelectedImage(state, 180, 90)).toBe(state);
  });

  // ── insertTableAtSelection ─────────────────────────────────────────────────

  it("inserts a table with correct dimensions after the current paragraph", () => {
    const state = createEditor2StateFromTexts(["before", "after"], { blockIndex: 0, offset: 3 });
    const next = insertTableAtSelection(state, 2, 3);

    // Document should now have 3 blocks: para "before", table, para "after"
    expect(next.document.blocks.length).toBe(3);
    expect(next.document.blocks[0]?.type).toBe("paragraph");
    expect(next.document.blocks[1]?.type).toBe("table");
    expect(next.document.blocks[2]?.type).toBe("paragraph");

    const table = next.document.blocks[1];
    if (table?.type !== "table") throw new Error("not a table");
    expect(table.rows.length).toBe(2);
    expect(table.rows[0]?.cells.length).toBe(3);
    expect(table.rows[1]?.cells.length).toBe(3);
  });

  it("moves the caret into the first cell after table insertion", () => {
    const state = createEditor2StateFromTexts(["hello"], { blockIndex: 0, offset: 5 });
    const next = insertTableAtSelection(state, 3, 3);

    const table = next.document.blocks[1];
    if (table?.type !== "table") throw new Error("not a table");
    const firstCellParagraph = table.rows[0]!.cells[0]!.blocks[0]!;
    expect(next.selection.focus.paragraphId).toBe(firstCellParagraph.id);
    expect(next.selection.focus.offset).toBe(0);
    expect(next.selection.anchor.paragraphId).toBe(firstCellParagraph.id);
  });

  it("each table cell starts with an empty paragraph", () => {
    const state = createEditor2StateFromTexts(["x"], { blockIndex: 0, offset: 0 });
    const next = insertTableAtSelection(state, 2, 2);

    const table = next.document.blocks[1];
    if (table?.type !== "table") throw new Error("not a table");
    for (const row of table.rows) {
      for (const cell of row.cells) {
        expect(cell.blocks.length).toBe(1);
        expect(getParagraphText(cell.blocks[0]!)).toBe("");
      }
    }
  });

  it("does not collapse surrounding paragraphs when inserting table", () => {
    const state = createEditor2StateFromTexts(["A", "B", "C"], { blockIndex: 1, offset: 0 });
    const next = insertTableAtSelection(state, 1, 2);

    // "A" stays at index 0, table at 1, "B" at 2, "C" at 3
    expect(next.document.blocks.length).toBe(4);
    const texts = next.document.blocks
      .filter((b) => b.type === "paragraph")
      .map((b) => (b.type === "paragraph" ? getParagraphText(b) : ""));
    expect(texts).toEqual(["A", "B", "C"]);
  });
});
