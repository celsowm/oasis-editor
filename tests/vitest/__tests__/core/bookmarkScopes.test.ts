import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { type EditorParagraphNode, type EditorTextRun } from "@/core/model.js";
import { buildIndexPlan } from "@/core/document/indexPlan.js";
import { buildToaPlan } from "@/core/document/toaPlan.js";
import { projectDocumentLayout } from "@/layoutProjection/documentLayout.js";

const ctrl = (id: string, kind: "begin" | "separate" | "end"): EditorTextRun =>
  ({ id, kind: "fieldChar", text: "", fieldChar: { kind } });
const instr = (id: string, raw: string): EditorTextRun =>
  ({ id, kind: "fieldInstruction", text: "", fieldInstruction: raw });
function marked(id: string, label: string, raw: string): EditorParagraphNode {
  const p = createEditorParagraph(label);
  p.id = id;
  p.runs = [
    { id: id + "t", kind: "text", text: label },
    ctrl(id + "b", "begin"), instr(id + "i", raw), ctrl(id + "e", "end"),
  ];
  return p;
}
function field(id: string, raw: string): EditorParagraphNode {
  const p = createEditorParagraph("");
  p.id = id;
  p.runs = [ctrl(id + "b", "begin"), instr(id + "i", raw), ctrl(id + "s", "separate"), ctrl(id + "e", "end")];
  return p;
}
function scopedDocument(kind: "xe" | "ta", raw: string) {
  const entries = ["A", "B", "C"].map((label, i) =>
    marked(`entry${i}`, label, kind === "xe" ? ` XE "${label}" ` : ` TA \\l "${label}" \\c 1 `));
  const first = entries[0]!, last = entries[2]!;
  const paragraphs = [field("head", raw), field("tail", ""), ...entries];
  const document = createEditorDocument(paragraphs);
  return {
    document,
    state: createEditorStateFromDocument({
      ...document,
      bookmarks: { order: ["bm"], items: { bm: {
        id: "bm", name: "Scope", start: { paragraphId: first.id, offset: 1 },
        end: { paragraphId: last.id, offset: 0 },
      } } },
    } as typeof document),
  };
}

describe("bookmark-scoped authority and index plans", () => {
  it("INDEX \\b collects only XE entries inside the bookmark", () => {
    const raw = ' INDEX \\z "1046" \\b Scope ';
    const { state } = scopedDocument("xe", raw);
    const layout = projectDocumentLayout(state.document);
    const plan = buildIndexPlan(state.document, layout, raw)!;
    expect(plan.entries.map(e => e.path[0])).toEqual(["A", "B"]);
  });

  it("TA \\r resolves a bookmark range into the TOA plan", () => {
    const raw = ' TOA \\c "1" ';
    const ta = marked("ta", "Barber", ' TA \\l "Barber" \\c 1 \\r Range ');
    const tail = marked("tail", "Fim", ' TA \\l "Fim" \\c 2 ');
    const document = createEditorDocument([field("head", raw), field("end", ""), ta, tail]);
    const state = createEditorStateFromDocument({
      ...document,
      bookmarks: { order: ["bm"], items: { bm: {
        id: "bm", name: "Range", start: { paragraphId: "ta", offset: 1 },
        end: { paragraphId: "tail", offset: 0 },
      } } },
    } as typeof document);
    const plan = buildToaPlan(state.document, projectDocumentLayout(state.document), raw, "pt-BR")!;
    expect(plan.entries).toHaveLength(1);
    expect(plan.entries[0]!.ranges).toHaveLength(1);
    expect(plan.entries[0]!.ranges![0]![0]!.label).toBe("1");
  });

  it("TOA \\b collects only TA entries and plans bookmark range references", () => {
    const raw = ' TOA \\c "1" \\b Scope ';
    const { state } = scopedDocument("ta", raw);
    const layout = projectDocumentLayout(state.document);
    const plan = buildToaPlan(state.document, layout, raw, "pt-BR")!;
    expect(plan.entries.map(e => e.label)).toEqual(["A", "B"]);
    expect(plan.settings.bookmark).toBe("Scope");
  });
});
