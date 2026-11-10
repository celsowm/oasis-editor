import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getDocumentParagraphs,
  paragraphOffsetToPosition,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import type { EditorTextStyle } from "@/core/model.js";
import {
  applyUnderlineStyle,
  toggleTextStyle,
} from "@/core/commands/textFormatting.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
function fixture(style: EditorTextStyle) {
  const p = createEditorParagraphFromRuns([{ text: "before target after" }]);
  p.style = { styleId: "InheritedNote" };
  const state = createEditorStateFromDocument(createEditorDocument([p]));
  state.document.styles = {
    ...state.document.styles,
    InheritedNote: {
      id: "InheritedNote",
      name: "Inherited note",
      type: "paragraph",
      textStyle: style,
    },
  };
  state.selection = {
    anchor: paragraphOffsetToPosition(p, 7),
    focus: paragraphOffsetToPosition(p, 13),
  };
  return state;
}
const toggles = [
  ["bold", "b"],
  ["italic", "i"],
  ["strike", "strike"],
  ["doubleStrike", "dstrike"],
  ["smallCaps", "smallCaps"],
  ["allCaps", "caps"],
  ["hidden", "vanish"],
  ["noProof", "noProof"],
  ["webHidden", "webHidden"],
  ["specVanish", "specVanish"],
  ["outline", "outline"],
  ["shadow", "shadow"],
  ["emboss", "emboss"],
  ["imprint", "imprint"],
] as const;
describe("DOCX inherited formatting overrides", () => {
  it.each(toggles)(
    "persists explicit %s off while keeping adjacent inherited text on",
    async (key, tag) => {
      const initial = fixture({ [key]: true });
      const next = toggleTextStyle(initial, key);
      const bytes = await exportEditorDocumentToDocx(next.document);
      const zip = await JSZip.loadAsync(bytes);
      const xml = await zip.file("word/document.xml")!.async("string");
      expect(xml).toContain(`<w:${tag} w:val="0"/>`);
      const loaded = await importDocxToEditorDocument(bytes);
      const p = getDocumentParagraphs(loaded)[0]!;
      const target = p.runs.find((r) => r.text === "target")!;
      expect(
        resolveEffectiveTextStyleForParagraph(
          target.styles,
          p.style?.styleId,
          loaded.styles,
        )[key],
      ).toBe(false);
      const before = p.runs.find((r) => r.text === "before ")!;
      expect(
        resolveEffectiveTextStyleForParagraph(
          before.styles,
          p.style?.styleId,
          loaded.styles,
        )[key],
      ).toBe(true);
    },
  );
  it("preserves an explicit contextual-alternates off override", async () => {
    const next = toggleTextStyle(
      fixture({ contextualAlternates: true }),
      "contextualAlternates",
    );
    const bytes = await exportEditorDocumentToDocx(next.document);
    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("word/document.xml")!.async("string")).toContain(
      '<w14:cntxtAlts w14:val="0"/>',
    );
    const loaded = await importDocxToEditorDocument(bytes);
    const p = getDocumentParagraphs(loaded)[0]!;
    const run = p.runs.find((r) => r.text === "target")!;
    expect(
      resolveEffectiveTextStyleForParagraph(
        run.styles,
        p.style?.styleId,
        loaded.styles,
      ).contextualAlternates,
    ).toBe(false);
  });
  it("omits unused off overrides on ordinary unformatted text", async () => {
    const initial = fixture({});
    const bytes = await exportEditorDocumentToDocx(initial.document);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).not.toContain('<w:b w:val="0"/>');
    expect(xml).not.toContain('<w:u w:val="none"/>');
    expect(xml).not.toContain('<w:vertAlign w:val="baseline"/>');
  });
  it.each([null, "single"] as const)(
    "persists %s over an inherited double underline",
    async (style) => {
      const next = applyUnderlineStyle(
        fixture({ underline: true, underlineStyle: "double" }),
        style,
      );
      const bytes = await exportEditorDocumentToDocx(next.document);
      const zip = await JSZip.loadAsync(bytes);
      const xml = await zip.file("word/document.xml")!.async("string");
      expect(xml).toContain(`<w:u w:val="${style ?? "none"}"/>`);
      const loaded = await importDocxToEditorDocument(bytes);
      const p = getDocumentParagraphs(loaded)[0]!;
      const target = p.runs.find((r) => r.text === "target")!;
      const effective = resolveEffectiveTextStyleForParagraph(
        target.styles,
        p.style?.styleId,
        loaded.styles,
      );
      expect(effective.underline).toBe(style !== null);
      expect(effective.underlineStyle).toBe(style);
    },
  );
  it.each(["superscript", "subscript"] as const)(
    "persists baseline after disabling inherited %s",
    async (key) => {
      const next = toggleTextStyle(fixture({ [key]: true }), key);
      const bytes = await exportEditorDocumentToDocx(next.document);
      const zip = await JSZip.loadAsync(bytes);
      expect(await zip.file("word/document.xml")!.async("string")).toContain(
        '<w:vertAlign w:val="baseline"/>',
      );
      const loaded = await importDocxToEditorDocument(bytes);
      const p = getDocumentParagraphs(loaded)[0]!;
      const target = p.runs.find((r) => r.text === "target")!;
      const effective = resolveEffectiveTextStyleForParagraph(
        target.styles,
        p.style?.styleId,
        loaded.styles,
      );
      expect(effective.superscript).toBe(false);
      expect(effective.subscript).toBe(false);
    },
  );
});
