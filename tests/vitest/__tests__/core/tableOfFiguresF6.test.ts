import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, getParagraphLength, getParagraphText, paragraphOffsetToPosition, type EditorParagraphNode, type EditorState, type EditorTextRun } from "@/core/model.js";
import { parseTocInstruction } from "@/core/document/tocFields.js";
import { collectCaptionOccurrences } from "@/core/document/captionEntries.js";
import { findQualifiedFigureTocRegion, refreshTableOfFigures } from "@/core/document/tableOfFigures.js";
import {
  canInsertTableOfFigures, canUpdateTableOfFigures, insertTableOfFigures,
  listCaptionIdentifiers, updateTableOfFigures,
} from "@/core/commands/tableOfFigures.js";
import { createImageCaptionParagraph } from "@/core/document/imageCaptions.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });

function fixture(raw = ' TOC \\c "Figure" ') {
  const begin = createEditorParagraph(""); begin.runs = [ctrl("ib", "begin"), instr("ii", raw), ctrl("is", "separate")];
  const stale = createEditorParagraph("Figura antiga 99");
  const end = createEditorParagraph(""); end.runs = [ctrl("ie", "end")];
  const first = createImageCaptionParagraph("Sistema", "Figure", 1);
  const second = createImageCaptionParagraph("Fluxo", "Figure", 2);
  const table = createImageCaptionParagraph("Dados", "Table", 1);
  table.runs.forEach(r => {
    if (r.kind === "fieldInstruction") r.fieldInstruction = " SEQ Table \\* ARABIC ";
  });
  const document = createEditorDocument([begin, stale, end, first, second, table]);
  return { state: createEditorStateFromDocument(document), begin, stale, end, first, second };
}
function cache(state: EditorState): EditorParagraphNode[] {
  const blocks = getDocumentSections(state.document)[0]!.blocks, region = findQualifiedFigureTocRegion(blocks)!;
  return blocks.slice(region.start + 1, region.end).filter(b => b.type === "paragraph");
}

describe("F6 caption TOC grammar and inventory", () => {
  it("parses caption switches while leaving heading TOC grammar intact", () => {
    expect(parseTocInstruction(' TOC \\c "Figure" \\h \\p ": " ')).toMatchObject({
      captionIdentifier: "Figure", hyperlinks: true, entryPageSeparator: ": ",
    });
    expect(parseTocInstruction(' TOC \\a Table \\s Chapter \\d "." \\n 1-2 \\w \\x ')).toMatchObject({
      unlabeledIdentifier: "Table", chapterIdentifier: "Chapter", chapterSeparator: ".", omitPages: [1, 2],
      preserveTabs: true, preserveLineBreaks: true,
    });
    expect(parseTocInstruction(' TOC \\o "1-3" ')).toMatchObject({ startLevel: 1, endLevel: 3 });
    expect(parseTocInstruction(' TOC \\c "Figure" \\o "1-3" ')).toBeUndefined();
    expect(parseTocInstruction(' TOC \\c "Figure" \\c "Table" ')).toBeUndefined();
  });

  it("inventory keeps figure and table captions separate", () => {
    const { state } = fixture();
    expect(collectCaptionOccurrences(state.document, "Figure")?.map(c => [c.number, c.display])).toEqual([
      [1, "Figure 1: Sistema"], [2, "Figure 2: Fluxo"],
    ]);
    expect(collectCaptionOccurrences(state.document, "Table")?.length).toBe(1);
  });
});

describe("F6 table-of-figures regeneration", () => {
  it("renders captions with page labels and preserves sources", () => {
    const { state, begin, end, first, second } = fixture(), before = JSON.stringify(state);
    const result = refreshTableOfFigures(state);
    expect(result.status).toBe("updated");
    expect(cache(result.state).map(getParagraphText)).toEqual(["Figure 1: Sistema\t1", "Figure 2: Fluxo\t1"]);
    for (const original of [begin, end, first, second])
      expect(getDocumentSections(result.state.document)[0]!.blocks.find(b => b.id === original.id)).toEqual(original);
    expect(result.state.selection).toBe(state.selection);
    expect(JSON.stringify(state)).toBe(before);
    expect(refreshTableOfFigures(result.state)).toMatchObject({ status: "unchanged", state: result.state });
  });

  it("supports unlabeled captions, custom separators and page omission", () => {
    const unlabeled = fixture(' TOC \\a Figure \\p ": " ');
    expect(refreshTableOfFigures(unlabeled.state).status).toBe("updated");
    expect(cache(refreshTableOfFigures(unlabeled.state).state).map(getParagraphText)).toEqual([
      "Sistema: 1", "Fluxo: 1",
    ]);
    const omitted = fixture(" TOC \\c \"Figure\" \\n 1-1 ");
    const plan = refreshTableOfFigures(omitted.state);
    expect(plan.status).toBe("updated");
    expect(cache(plan.state).map(getParagraphText)).toEqual(["Figure 1: Sistema", "Figure 2: Fluxo\t1"]);
  });

  it("refuses nonconvergence and publishes transactional insertions", () => {
    const { state } = fixture();
    expect(refreshTableOfFigures(state, undefined, 1)).toMatchObject({ state, status: "nonconvergent" });
    const base = createEditorStateFromDocument(createEditorDocument([createImageCaptionParagraph("Sistema", "Figure", 1)]));
    const p = getDocumentSections(base.document)[0]!.blocks[0] as EditorParagraphNode;
    const pos = paragraphOffsetToPosition(p, getParagraphLength(p));
    const positioned: EditorState = { ...base, selection: { anchor: pos, focus: pos } };
    const inserted = insertTableOfFigures(positioned, { identifier: "Figure" });
    expect(inserted).not.toBe(positioned);
    expect(listCaptionIdentifiers(positioned)).toEqual(["Figure"]);
    expect(canInsertTableOfFigures(positioned)).toBe(true);
    expect(canUpdateTableOfFigures(inserted)).toBe(true);
    expect(updateTableOfFigures(inserted)).toBe(inserted);
  });
});
