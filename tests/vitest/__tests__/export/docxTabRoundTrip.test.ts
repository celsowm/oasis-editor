import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { editParagraphTabStops } from "@/core/commands/paragraphTabs.js";
import { getDocumentParagraphs, getParagraphText, resolveEffectiveParagraphStyle } from "@/core/model.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

describe("tab stops DOCX round trip", () => {
  it("preserves real tabs, inherited positions, clear markers and the document interval through re-export", async () => {
    const p = createEditorParagraph("A\tB\tC");
    p.style = {styleId:"tabBody",tabs:[{position:72,type:"decimal",leader:"middleDot"}]};
    const doc = createEditorDocument([p]);
    doc.styles = {...doc.styles,
      tabBase:{id:"tabBase",name:"Tab Base",type:"paragraph",paragraphStyle:{tabs:[{position:36,type:"left"},{position:108,type:"right",leader:"dot"}]}},
      tabBody:{id:"tabBody",name:"Tab Body",type:"paragraph",basedOn:"tabBase",paragraphStyle:{tabs:[{position:144,type:"bar"}]}},
    };
    const state = editParagraphTabStops(createEditorStateFromDocument(doc), {clear:[36],default:24});
    const expected = [
      {position:36,type:"clear"},
      {position:72,type:"decimal",leader:"middleDot"},
      {position:108,type:"right",leader:"dot"},
      {position:144,type:"bar"},
    ];
    expect(resolveEffectiveParagraphStyle(getDocumentParagraphs(state.document)[0]!.style,state.document.styles).tabs).toEqual(expected);
    const once = await importDocxToEditorDocument(await exportEditorDocumentToDocx(state.document));
    const bytes = await exportEditorDocumentToDocx(once);
    const twice = await importDocxToEditorDocument(bytes);
    const paragraph = getDocumentParagraphs(twice)[0]!;
    expect(getParagraphText(paragraph)).toBe("A\tB\tC");
    expect(twice.settings?.defaultTabStop).toBe(24);
    expect(resolveEffectiveParagraphStyle(paragraph.style,twice.styles).tabs).toEqual(expected);
    const zip = await JSZip.loadAsync(bytes);
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml.match(/<w:tab\s*\/>/g)).toHaveLength(2);
    expect(xml).toContain('w:val="clear"');
  });
});
