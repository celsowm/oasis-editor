import { describe, expect, it, vi } from "vitest";
import { createEditorDocument, createEditorParagraphFromRuns } from "@/core/editorState.js";
import { exportEditorDocumentToPdfBlob } from "@/export/pdf/exportEditorDocumentToPdf.js";
import { OasisPdfWriter } from "@/export/pdf/OasisPdfWriter.js";
import { groupSlotChunksByWhitespace } from "@/export/pdf/draw/fragment/pdfTextChunks.js";

describe("PDF tab rendering", () => {
  it("paints a leader even when the tab is in a run by itself", async () => {
    const p = createEditorParagraphFromRuns([{text:"A"},{text:"\t",styles:{bold:true}},{text:"B"}]);
    p.style = {tabs:[{position:72,type:"right",leader:"dot"},{position:108,type:"bar"}]};
    const spy = vi.spyOn(OasisPdfWriter.prototype, "drawLine");
    try {
      await exportEditorDocumentToPdfBlob(createEditorDocument([p]));
      const strokes = spy.mock.calls.map(call=>call[1]);
      expect(strokes.some(s => s.dashArray?.join(",")==="1,3" && s.x2>s.x1)).toBe(true);
      expect(strokes.some(s => s.x1===s.x2 && s.y2>s.y1)).toBe(true);
    } finally {spy.mockRestore();}
  });
  it("does not join separated tab fields under justification", () => {
    const a = {char:"A",offset:0,left:0};
    const b = {char:"B",offset:2,left:96};
    expect(groupSlotChunksByWhitespace([a,b])).toEqual([[a],[b]]);
  });
});
