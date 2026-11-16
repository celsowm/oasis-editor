import { describe, expect, it } from "vitest";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { getDocumentParagraphs, getParagraphText, paragraphOffsetToPosition } from "@/core/model.js";
import { serializeEditorSelectionToHtml, insertClipboardParagraphsAtSelection } from "@/core/commands/clipboard.js";
import { mergeClipboardFormatting } from "@/core/commands/clipboardMergeFormatting.js";
import { parseEditorClipboardHtmlWithDom } from "@/app/clipboard/htmlClipboardParser.js";

describe("tab clipboard interchange", () => {
  it("retains literal tabs and exact tab-stop metadata in a rich paste into an empty paragraph", () => {
    const p = createEditorParagraph("A\tB");
    p.style = {tabs:[{position:72,type:"right",leader:"dot"},{position:96,type:"bar"}]};
    const document = createEditorDocument([p]);
    document.settings = {defaultTabStop:24};
    const state = {...createEditorStateFromDocument(document),selection:{
      anchor:paragraphOffsetToPosition(p,0),focus:paragraphOffsetToPosition(p,3),
    }};
    const html = serializeEditorSelectionToHtml(state);
    expect(html).toContain("white-space:pre-wrap");
    expect(html).toContain("tab-size:24pt");
    const specs = parseEditorClipboardHtmlWithDom(html);
    expect(specs[0]?.style?.tabs).toEqual(p.style.tabs);
    const dest = createEditorParagraph("");
    dest.style = {align:"left"};
    const target = createEditorStateFromDocument(createEditorDocument([dest]));
    const pasted = insertClipboardParagraphsAtSelection(target,specs);
    const result = getDocumentParagraphs(pasted.document)[0]!;
    expect(getParagraphText(result)).toBe("A\tB");
    expect(result.style?.tabs).toEqual(p.style.tabs);
    expect(pasted.document.settings?.defaultTabStop).toBeUndefined();
    expect(mergeClipboardFormatting(target,specs)[0]?.style?.tabs).toBeUndefined();
  });
  it("recognizes bounded Word HTML tab placeholders without treating arbitrary text as tabs", () => {
    const spec = parseEditorClipboardHtmlWithDom('<p>A<span style="mso-tab-count:2">&nbsp;&nbsp;</span>B<span style="mso-tab-count:1">keep</span></p>')[0]!;
    expect(spec.runs.map(r=>r.text).join("")).toBe("A\t\tBkeep");
  });
  it("rejects malformed or unbounded metadata", () => {
    for (const raw of ['not-json','[{"position":99999,"type":"left"}]','[{"position":36,"type":"invalid"}]']) {
      const html = "<p data-oasis-tab-stops='" + raw + "'>A\tB</p>";
      expect(parseEditorClipboardHtmlWithDom(html)[0]?.style?.tabs).toBeUndefined();
    }
  });
});
