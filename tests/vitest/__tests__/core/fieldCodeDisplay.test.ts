import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentSections, type EditorParagraphNode, type EditorTextRun } from "@/core/model.js";
import { fieldCodeHiddenOffsets, getFieldCodeOverlays } from "@/core/document/fieldCodeDisplay.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";
import { drawParagraph } from "@/ui/canvas/canvasParagraphPainter.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });

function fixture(): EditorParagraphNode {
  return { ...createEditorParagraph(""), id: "p", runs: [
    { id: "pre", kind: "text", text: "Total: " },
    ctrl("b", "begin"), instr("i", " PAGE "), ctrl("s", "separate"),
    { id: "r", kind: "text", text: "1" }, ctrl("e", "end"),
  ] };
}

describe("field code display projection", () => {
  it("projects only complete single-paragraph spans and hides cached offsets", () => {
    const overlays = getFieldCodeOverlays(fixture());
    expect(overlays).toEqual([{ start: 7, end: 8, text: "{  PAGE  }" }]);
    expect([...fieldCodeHiddenOffsets(overlays)]).toEqual([7]);
    const broken = fixture();
    broken.runs.push(ctrl("orphan", "end"));
    expect(getFieldCodeOverlays(broken)).toEqual([]);
  });

  it("paints the instruction and suppresses the cached result when toggled", () => {
    const paragraph = fixture();
    const state = createEditorStateFromDocument(createEditorDocument([paragraph]));
    const layout = projectDocumentLayout(state.document);
    const block = layout.pages[0]!.blocks.find(b => b.sourceBlockId === paragraph.id)!;
    const calls: string[] = [];
    const ctx = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, key) => {
        if (key === "fillText") return (text: string) => { calls.push(text); };
        if (key === "measureText") return () => ({ width: 8 });
        if (key === "font" || key === "fillStyle" || key === "strokeStyle") return "";
        if (key === "canvas") return { width: 800, height: 1000 };
        return () => undefined;
      },
      set: () => true,
    });
    drawParagraph(ctx, paragraph, block.layout!.lines,
      { ...state, showFieldCodes: true }, 0, 0, () => undefined, {} as never, 0);
    expect(calls).toContain("{  PAGE  }");
    expect(calls).not.toContain("1");
    const withoutOverlay: string[] = [];
    const ctx2 = new Proxy({} as CanvasRenderingContext2D, {
      get: (_target, key) => {
        if (key === "fillText") return (text: string) => { withoutOverlay.push(text); };
        if (key === "measureText") return () => ({ width: 8 });
        if (key === "canvas") return { width: 800, height: 1000 };
        return () => undefined;
      },
      set: () => true,
    });
    drawParagraph(ctx2, paragraph, block.layout!.lines,
      state, 0, 0, () => undefined, {} as never, 0);
    expect(withoutOverlay).toContain("1");
    expect(withoutOverlay).not.toContain("{  PAGE  }");
    expect(getDocumentSections(state.document)[0]!.blocks[0]).toBe(paragraph);
  });
});
