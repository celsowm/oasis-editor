import { deleteBackward, deleteForward } from "@/core/commands/textDeletion.js";
import { applyUnderlineStyle, clearSelectedTextFormatting, nudgeFontSize, setTextStyleValue, toggleCharacterBorder, toggleTextStyle } from "@/core/commands/textFormatting.js";
import { splitBlockAtSelection } from "@/core/commands/block.js";
import { insertPlainTextAtSelection } from "@/core/commands/textEditing.js";
import { deleteSelectionRange } from "@/core/selection/rangeEditing.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { paragraphOffsetToPosition, resolveEffectiveTextStyleForParagraph } from "@/core/model.js";
import { insertTextAtSelection } from "@/core/commands/textEditing.js";
import { getRunImage, getRunTextBox, getRunField, getRunFieldChar, getRunFieldInstruction, getRunFootnoteReference, getRunEndnoteReference, getRunSym } from "@/core/model.js";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";
import type {
  EditorDocument,
  EditorTextRun,
} from "@/core/model.js";

async function buildDocx(bodyXml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
            xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>${bodyXml}
    <w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: "arraybuffer" });
}

/** All body runs in document order. */
function allRuns(document: EditorDocument): EditorTextRun[] {
  return getDocumentParagraphs(document).flatMap((p) => p.runs);
}

function fieldCharKinds(
  document: EditorDocument,
): Array<"begin" | "separate" | "end"> {
  return allRuns(document).flatMap((r) => {
    const fc = getRunFieldChar(r);
    return fc ? [fc.kind] : [];
  });
}

function instructions(document: EditorDocument): string[] {
  return allRuns(document)
    .map((r) => getRunFieldInstruction(r))
    .filter((i): i is string => i !== undefined);
}

async function exportXml(document: EditorDocument): Promise<string> {
  const zip = await JSZip.loadAsync(await exportEditorDocumentToDocx(document));
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
}

async function roundTrip(bodyXml: string): Promise<{
  imported: EditorDocument;
  xml: string;
  reimported: EditorDocument;
}> {
  const imported = await importDocxToEditorDocument(await buildDocx(bodyXml));
  const xml = await exportXml(imported);
  const reimported = await importDocxToEditorDocument(
    await exportEditorDocumentToDocx(imported),
  );
  return { imported, xml, reimported };
}

describe("DOCX import: exact field instruction heads",()=>{
  it("does not promote quoted or positional recognized names to standalone fields",async()=>{
    const samples=[' IF "NUMPAGES" = "PAGE" "DATE" "REF" ',' AUTHOR "PAGE" ',' MERGEFIELD DATE ',' PAGE \\* Unsupported ',' REF Target \\n ',' DATE \\@ "unterminated '];
    for(const instr of samples){
      const escaped=instr.replace(/&/g,"&amp;").replace(/"/g,"&quot;");
      for(const body of [
        '<w:fldSimple w:instr="'+escaped+'"><w:r><w:t>Cached</w:t></w:r></w:fldSimple>',
        '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve">'+escaped+'</w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Cached</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>',
      ]){
        const {imported,reimported}=await roundTrip('<w:p>'+body+'</w:p>');
        for(const doc of [imported,reimported]){
          expect(allRuns(doc).some(r=>getRunField(r))).toBe(false);
          expect(instructions(doc)).toEqual([instr]);
          expect(allRuns(doc).some(r=>r.text==="Cached")).toBe(true);
        }
      }
    }
  });
  it("recognizes split instructions and REF targets named like other fields",async()=>{
    const {imported}=await roundTrip('<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> RE</w:instrText></w:r><w:r><w:instrText>F NUMPAGES \\h </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Target</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>');
    expect(allRuns(imported).map(getRunField).filter(Boolean)).toEqual([{type:"REF",bookmark:"NUMPAGES"}]);
    const simple=await roundTrip('<w:p><w:fldSimple w:instr=" PAGEREF &quot;PAGE target&quot; \\h "><w:r><w:t>3</w:t></w:r></w:fldSimple></w:p>');
    expect(allRuns(simple.reimported).map(getRunField).filter(Boolean)).toEqual([{type:"PAGEREF",bookmark:"PAGE target"}]);
  });
});

describe("DOCX import: complex fields (REF / PAGEREF / TOC)", () => {
  it("preserves a SEQ Figure caption field", async () => {
    const { imported, xml } = await roundTrip(
      `<w:p>
        <w:pPr><w:pStyle w:val="Caption"/></w:pPr>
        <w:r><w:t>Figure </w:t></w:r>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> SEQ Figure \\* ARABIC </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>4</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
        <w:r><w:t>: Imported caption</w:t></w:r>
      </w:p>`,
    );

    expect(getDocumentParagraphs(imported)[0]?.style?.styleId).toBe("Caption");
    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([" SEQ Figure \\* ARABIC "]);
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> SEQ Figure \\* ARABIC </w:instrText>',
    );
  });

  it("collapses a REF cross-reference field into a typed REF run with its bookmark", async () => {
    const { imported, xml, reimported } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> REF Target \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>Result text</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );

    // REF collapses into a typed field with its bookmark target + cached result.
    const refRun = allRuns(imported).find((r) => getRunField(r)?.type === "REF");
    expect(refRun).toBeDefined();
    expect(getRunField(refRun!)?.bookmark).toBe("Target");
    expect(refRun!.text).toBe("Result text");
    // Collapsed: no preserved fldChar markers remain for REF.
    expect(fieldCharKinds(imported)).toEqual([]);

    // The cached result still survives as the field's displayed text.
    expect(allRuns(imported).some((r) => r.text === "Result text")).toBe(true);

    // Re-export replays the source paragraph (round-trip fidelity, like PAGE),
    // so the complex field and its bookmark instruction survive verbatim.
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> REF Target \\h </w:instrText>',
    );
    // And re-import collapses it back into the same typed REF field.
    expect(
      getRunField(allRuns(reimported).find((r) => getRunField(r)?.type === "REF")!),
    ).toEqual({ type: "REF", bookmark: "Target" });
  });

  it("collapses a PAGEREF field into a typed PAGEREF run with its bookmark", async () => {
    const { imported, xml } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> PAGEREF _Ref1 \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>3</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );
    // PAGEREF collapses into its own typed field (not PAGE) with the target.
    const refRun = allRuns(imported).find(
      (r) => getRunField(r)?.type === "PAGEREF",
    );
    expect(refRun).toBeDefined();
    expect(getRunField(refRun!)?.bookmark).toBe("_Ref1");
    expect(fieldCharKinds(imported)).toEqual([]);
    // Re-export replays the source paragraph, preserving the PAGEREF verbatim.
    expect(xml).toContain(
      '<w:instrText xml:space="preserve"> PAGEREF _Ref1 \\h </w:instrText>',
    );
  });

  it("preserves a TOC field whose begin/end span multiple paragraphs", async () => {
    const { imported, xml, reimported } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:hyperlink w:anchor="_Toc1"><w:r><w:t>Heading One</w:t></w:r></w:hyperlink>
      </w:p>
      <w:p>
        <w:hyperlink w:anchor="_Toc2"><w:r><w:t>Heading Two</w:t></w:r></w:hyperlink>
      </w:p>
      <w:p>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );

    // begin/separate live in the first paragraph, end in the last — preserved.
    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([` TOC \\o "1-3" \\h `]);
    // The internal hyperlinks (cached TOC entries) survive too.
    const links = allRuns(imported)
      .map((r) => r.styles?.link)
      .filter(Boolean);
    expect(links).toEqual(["#_Toc1", "#_Toc2"]);

    // Re-export keeps begin before end across paragraphs.
    expect(xml.indexOf('w:fldCharType="begin"')).toBeGreaterThanOrEqual(0);
    expect(xml.indexOf('w:fldCharType="begin"')).toBeLessThan(
      xml.indexOf('w:fldCharType="end"'),
    );
    expect(fieldCharKinds(reimported)).toEqual(["begin", "separate", "end"]);
  });

  it("preserves an unknown complex field verbatim", async () => {
    const { imported } = await roundTrip(
      `<w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> AUTHOR "Jane Doe" </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>Jane Doe</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );
    expect(fieldCharKinds(imported)).toEqual(["begin", "separate", "end"]);
    expect(instructions(imported)).toEqual([` AUTHOR "Jane Doe" `]);
    expect(allRuns(imported).some((r) => getRunField(r))).toBe(false);
  });

  it("still collapses a complete single-paragraph PAGE field to a PAGE run", async () => {
    const { imported } = await roundTrip(
      `<w:p>
        <w:r>
          <w:fldChar w:fldCharType="begin"/>
          <w:instrText xml:space="preserve">PAGE</w:instrText>
          <w:fldChar w:fldCharType="end"/>
        </w:r>
      </w:p>`,
    );
    expect(allRuns(imported).some((r) => getRunField(r)?.type === "PAGE")).toBe(true);
    // Collapsed: no preserved fldChar markers for PAGE.
    expect(fieldCharKinds(imported)).toEqual([]);
  });

  it("round-trips a bookmark target together with a REF pointing at it", async () => {
    const { reimported, xml } = await roundTrip(
      `<w:p>
        <w:bookmarkStart w:id="0" w:name="Target"/>
        <w:r><w:t>Anchored</w:t></w:r>
        <w:bookmarkEnd w:id="0"/>
      </w:p>
      <w:p>
        <w:r><w:fldChar w:fldCharType="begin"/></w:r>
        <w:r><w:instrText xml:space="preserve"> REF Target \\h </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>Anchored</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
      </w:p>`,
    );
    // Bookmark and (now typed) REF field both survive the full round-trip.
    expect(reimported.bookmarks?.order.length).toBe(1);
    const bm = reimported.bookmarks!.items[reimported.bookmarks!.order[0]!]!;
    expect(bm.name).toBe("Target");
    const refRun = allRuns(reimported).find((r) => getRunField(r)?.type === "REF");
    expect(getRunField(refRun!)?.bookmark).toBe("Target");
    expect(xml).toContain('<w:bookmarkStart w:id="0" w:name="Target"/>');
  });
});

describe("field preservation after adjacent model edits",()=>{
  for(const simple of [false,true]){
    it("retains locked/dirty and independently styled results ("+(simple?"simple":"complex")+")",async()=>{
      const result='<w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r><w:r><w:rPr><w:i/></w:rPr><w:t>Italic</w:t></w:r>';
      const field=simple
        ? '<w:fldSimple w:instr=" PAGE " w:fldLock="1" w:dirty="true">'+result+'</w:fldSimple>'
        : '<w:r><w:fldChar w:fldCharType="begin" w:fldLock="1" w:dirty="true"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>'+result+'<w:r><w:fldChar w:fldCharType="end"/></w:r>';
      const imported=await importDocxToEditorDocument(await buildDocx('<w:p><w:r><w:t>Before </w:t></w:r>'+field+'<w:r><w:t> after</w:t></w:r></w:p>'));
      expect(fieldCharKinds(imported)).toEqual(["begin","separate","end"]);
      expect(allRuns(imported).some(r=>getRunField(r))).toBe(false);
      const paragraph=getDocumentParagraphs(imported)[0]!;
      const initial=createEditorStateFromDocument(imported);
      const caret=paragraphOffsetToPosition(paragraph,3);
      const edited=insertTextAtSelection({...initial,selection:{anchor:caret,focus:caret}},"X");
      expect(fieldCharKinds(edited.document)).toEqual(["begin","separate","end"]);
      expect(instructions(edited.document)).toEqual([" PAGE "]);
      // Regeneration cannot replay the original unedited paragraph.
      const xml=await exportXml(edited.document);
      expect(xml).toContain("w:fldLock=");
      expect(xml).toContain("w:dirty=");
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(edited.document));
      expect(fieldCharKinds(reopened)).toEqual(["begin","separate","end"]);
      expect(instructions(reopened)).toEqual([" PAGE "]);
      expect(getRunFieldChar(allRuns(reopened).find(r=>getRunFieldChar(r)?.kind==="begin")!)).toMatchObject({fieldLock:true,dirty:true});
      expect(allRuns(reopened).find(r=>r.text==="Bold")?.styles?.bold).toBe(true);
      expect(allRuns(reopened).find(r=>r.text==="Italic")?.styles?.italic).toBe(true);
      expect(allRuns(reopened).map(r=>r.text).join("")).toBe("BefXore BoldItalic after");
    });
  }
  it("does not collapse a heterogeneous unlocked result or nested field",async()=>{
    const {imported}=await roundTrip('<w:p><w:fldSimple w:instr="PAGE"><w:r><w:rPr><w:b/></w:rPr><w:t>1</w:t></w:r><w:r><w:t>2</w:t></w:r></w:fldSimple></w:p>');
    expect(fieldCharKinds(imported)).toEqual(["begin","separate","end"]);
    const nested=await roundTrip('<w:p><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> IF </w:instrText></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>2</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:instrText> = 2 "Yes" "No" </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>Yes</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>');
    expect(fieldCharKinds(nested.imported)).toEqual(["begin","begin","separate","end","separate","end"]);
    expect(allRuns(nested.reimported).some(r=>getRunField(r))).toBe(false);
  });
  it("preserves text in a source run containing field controls",async()=>{
    const {imported}=await roundTrip('<w:p><w:r><w:fldChar w:fldCharType="begin" w:fldLock="1"/><w:instrText> PAGE </w:instrText><w:fldChar w:fldCharType="separate"/><w:t>42</w:t><w:fldChar w:fldCharType="end"/><w:t> tail</w:t></w:r></w:p>');
    expect(allRuns(imported).map(r=>r.text).join("")).toBe("42 tail");
    expect(fieldCharKinds(imported)).toEqual(["begin","separate","end"]);
  });
});

describe("field-aware adjacent editing",()=>{
  it("keeps controls through deletion, formatting, paragraph splits and multiline paste",async()=>{
    const doc=await importDocxToEditorDocument(await buildDocx('<w:p><w:r><w:t>Before </w:t></w:r><w:fldSimple w:instr=" PAGE " w:fldLock="1"><w:r><w:t>42</w:t></w:r></w:fldSimple><w:r><w:t> after</w:t></w:r></w:p>'));
    const state=createEditorStateFromDocument(doc),p=getDocumentParagraphs(doc)[0]!;
    const select=(a:number,b=a)=>({...state,selection:{anchor:paragraphOffsetToPosition(p,a),focus:paragraphOffsetToPosition(p,b)}});
    const scenarios=[
      deleteBackward(select(3)),deleteForward(select(3)),deleteSelectionRange(select(1,3)),
      toggleTextStyle(select(0,3),"bold"),splitBlockAtSelection(select(3)),
      insertPlainTextAtSelection(select(3),"X\nY"),
    ];
    for(const edited of scenarios){
      expect(edited.document).not.toBe(state.document);
      expect(fieldCharKinds(edited.document)).toEqual(["begin","separate","end"]);
      expect(instructions(edited.document)).toEqual([" PAGE "]);
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(edited.document));
      expect(fieldCharKinds(reopened)).toEqual(["begin","separate","end"]);
      expect(instructions(reopened)).toEqual([" PAGE "]);
      expect(getRunFieldChar(allRuns(reopened).find(r=>getRunFieldChar(r)?.kind==="begin")!)?.fieldLock).toBe(true);
      expect(allRuns(reopened).some(r=>r.text==="42")).toBe(true);
    }
    expect(allRuns(scenarios[0]!.document).map(r=>r.text).join("")).toBe("Beore 42 after"); // backward at 3 removes 'f'
    const inside=select(8),crossing=select(6,10);
    for(const next of [deleteBackward(inside),deleteForward(inside),insertTextAtSelection(inside,"x"),splitBlockAtSelection(inside),deleteSelectionRange(crossing),insertPlainTextAtSelection(crossing,"x\ny")]){
      expect(next.document).toBe(state.document);
    }
  });
});

describe("multiparagraph field adjacent inline editing",()=>{
  it("permits typing and deletion outside a TOC but protects every cached paragraph",async()=>{
    const doc=await importDocxToEditorDocument(await buildDocx(`
      <w:p><w:r><w:t>Outside</w:t></w:r></w:p>
      <w:p><w:r><w:t>Before</w:t></w:r><w:r><w:fldChar w:fldCharType="begin" w:fldLock="1"/></w:r>
        <w:r><w:instrText xml:space="preserve"> TOC </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r>
        <w:r><w:t>First</w:t></w:r></w:p>
      <w:p><w:r><w:t>Middle</w:t></w:r></w:p>
      <w:p><w:r><w:t>Last</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>After</w:t></w:r></w:p>
      <w:p><w:r><w:t>Outside</w:t></w:r></w:p>`));
    const initial=createEditorStateFromDocument(doc);
    const paragraphs=getDocumentParagraphs(doc);
    const selection=(i:number,a:number,b=a)=>{
      const p=paragraphs[i]!;
      return {...initial,selection:{anchor:paragraphOffsetToPosition(p,a),focus:paragraphOffsetToPosition(p,b)}};
    };
    const edits=[
      [insertTextAtSelection(selection(0,2),"X"),0,"OuXtside"],
      [insertTextAtSelection(selection(1,2),"X"),1,"BeXforeFirst"],
      [insertTextAtSelection(selection(3,6),"X"),3,"LastAfXter"],
      [insertTextAtSelection(selection(4,2),"X"),4,"OuXtside"],
      [deleteBackward(selection(1,3)),1,"BeoreFirst"],
      [deleteForward(selection(3,5)),3,"LastAter"],
      [deleteSelectionRange(selection(1,1,3)),1,"BoreFirst"],
    ] as const;
    for(const [edited,index,expected] of edits){
      expect(edited.document).not.toBe(initial.document);
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(edited.document));
      expect(getDocumentParagraphs(reopened)[index]!.runs.map(r=>r.text).join("")).toBe(expected);
      expect(fieldCharKinds(reopened)).toEqual(["begin","separate","end"]);
      expect(instructions(reopened)).toEqual([" TOC "]);
      expect(allRuns(reopened).find(r=>getRunFieldChar(r)?.kind==="begin")?.kind).toBe("fieldChar");
      expect(getRunFieldChar(allRuns(reopened).find(r=>getRunFieldChar(r)?.kind==="begin")!)?.fieldLock).toBe(true);
      expect(getDocumentParagraphs(reopened)[2]!.runs.map(r=>r.text).join("")).toBe("Middle");
    }
    for(const next of [
      insertTextAtSelection(selection(1,6),"X"),insertTextAtSelection(selection(1,8),"X"),
      insertTextAtSelection(selection(2,2),"X"),insertTextAtSelection(selection(3,4),"X"),
      deleteForward(selection(2,2)),deleteBackward(selection(2,2)),deleteSelectionRange(selection(2,1,3)),
      deleteSelectionRange(selection(1,5,7)),toggleTextStyle(selection(2,0,3),"bold"),
      splitBlockAtSelection(selection(0,2)),insertPlainTextAtSelection(selection(0,2),"x\ny"),
    ])expect(next.document).toBe(initial.document);
  });
});

describe("story-aware character formatting",()=>{
  it("formats adjacent ranges including exact edges without touching the field cache",async()=>{
    const doc=await importDocxToEditorDocument(await buildDocx(`
      <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Before</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="begin" w:fldLock="1" w:dirty="1"/></w:r>
        <w:r><w:instrText xml:space="preserve"> TOC </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>First</w:t></w:r></w:p>
      <w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Middle</w:t></w:r></w:p>
      <w:p><w:r><w:t>Last</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>
        <w:r><w:t>After</w:t></w:r></w:p>
      <w:p><w:r><w:t>Outside</w:t></w:r></w:p>`));
    const initial=createEditorStateFromDocument(doc);
    const ps=getDocumentParagraphs(doc);
    const select=(i:number,a:number,b:number,j=i)=>{
      return {...initial,selection:{anchor:paragraphOffsetToPosition(ps[i]!,a),focus:paragraphOffsetToPosition(ps[j]!,b)}};
    };
    const commands=[
      (s:typeof initial)=>toggleTextStyle(s,"bold"),
      (s:typeof initial)=>applyUnderlineStyle(s,"single"),
      (s:typeof initial)=>setTextStyleValue(s,"fontSize",24),
      (s:typeof initial)=>nudgeFontSize(s,2),
      (s:typeof initial)=>toggleCharacterBorder(s),
      (s:typeof initial)=>clearSelectedTextFormatting(s),
    ];
    for(const cmd of commands){
      // In particular, the prefix is selected right up to the begin marker.
      const edited=cmd(select(0,0,6));
      expect(edited.document).not.toBe(initial.document);
      const prefix=allRuns(edited.document).find(r=>r.text==="Before")!;
      expect(prefix.styles).not.toEqual(allRuns(doc).find(r=>r.text==="Before")!.styles);
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(edited.document));
      expect(fieldCharKinds(reopened)).toEqual(["begin","separate","end"]);
      expect(instructions(reopened)).toEqual([" TOC "]);
      expect(getRunFieldChar(allRuns(reopened).find(r=>getRunFieldChar(r)?.kind==="begin")!)).toMatchObject({fieldLock:true,dirty:true});
      for(const label of ["First","Middle","Last"]){
        const original=allRuns(doc).find(r=>r.text===label)!;
        expect(allRuns(edited.document).find(r=>r.text===label)?.styles).toEqual(original.styles);
        const effective=(d:EditorDocument)=>{
          const p=getDocumentParagraphs(d).find(p=>p.runs.some(r=>r.text===label))!;
          const run=p.runs.find(r=>r.text===label)!;
          return resolveEffectiveTextStyleForParagraph(run.styles,p.style?.styleId,d.styles);
        };
        const old=effective(doc),next=effective(reopened);
        // Serialization can materialize inherited defaults and round size.
        const {fontSize:oldSize,...oldStyle}=old;
        const {fontSize:nextSize,...nextStyle}=next;
        expect(nextStyle).toEqual(oldStyle);
        expect(nextSize).toBeCloseTo(oldSize,3);
      }
      for(const blocked of [select(0,5,7),select(1,0,6),select(2,0,5),select(0,0,9,2)]){
        expect(cmd(blocked).document).toBe(initial.document);
      }
    }
    for(const [selection,label] of [[select(2,4,9),"After"],[select(3,0,7),"Outside"]] as const){
      const edited=toggleTextStyle(selection,"bold");
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(edited.document));
      expect(allRuns(reopened).find(r=>r.text===label)?.styles?.bold).toBe(true);
      expect(fieldCharKinds(reopened)).toEqual(["begin","separate","end"]);
    }
    const tracked={...select(0,2,2),trackChangesEnabled:true};
    expect(insertTextAtSelection(tracked,"X").document).toBe(initial.document);
  });
});

describe("explicit invisible field boundary affinity",()=>{
  it("inserts outside coincident controls, preserves order, and never edits an interior edge",async()=>{
    const doc=await importDocxToEditorDocument(await buildDocx(`
      <w:p><w:r><w:t>Left</w:t></w:r>
        <w:r><w:fldChar w:fldCharType="begin" w:fldLock="1"/></w:r>
        <w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>
        <w:r><w:fldChar w:fldCharType="end"/></w:r>
        <w:r><w:t>Right</w:t></w:r></w:p>`));
    const initial=createEditorStateFromDocument(doc);
    const p=getDocumentParagraphs(doc)[0]!;
    const at=(fieldBoundaryAffinity?:"before-markers"|"after-markers")=>{
      const pos={...paragraphOffsetToPosition(p,4),fieldBoundaryAffinity};
      return {...initial,selection:{anchor:pos,focus:pos}};
    };
    expect(insertTextAtSelection(at(),"X").document).toBe(initial.document);
    for(const affinity of ["before-markers","after-markers"] as const){
      const edited=insertTextAtSelection(at(affinity),"X");
      expect(edited.document).not.toBe(initial.document);
      const twice=insertTextAtSelection(edited,"Y");
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(twice.document));
      const runs=allRuns(reopened);
      expect(runs.map(r=>r.text).join("")).toBe("LeftXYRight");
      expect(fieldCharKinds(reopened)).toEqual(["begin","end"]);
      expect(instructions(reopened)).toEqual([" PAGE "]);
      const begin=runs.findIndex(r=>getRunFieldChar(r)?.kind==="begin");
      const end=runs.findIndex(r=>getRunFieldChar(r)?.kind==="end");
      expect(runs.slice(0,begin).map(r=>r.text).join("")).toBe(affinity==="before-markers"?"LeftXY":"Left");
      expect(runs.slice(end+1).map(r=>r.text).join("")).toBe(affinity==="after-markers"?"XYRight":"Right");
    }
  });
  it("does not confuse a clipped cross-paragraph span with an actual field edge",async()=>{
    const doc=await importDocxToEditorDocument(await buildDocx(`
      <w:p><w:r><w:t>Left</w:t></w:r><w:r><w:fldChar w:fldCharType="begin"/></w:r>
      <w:r><w:instrText xml:space="preserve"> TOC </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>First</w:t></w:r></w:p>
      <w:p><w:r><w:t>Last</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r><w:r><w:t>Right</w:t></w:r></w:p>`));
    const initial=createEditorStateFromDocument(doc),ps=getDocumentParagraphs(doc);
    const at=(i:number,offset:number,fieldBoundaryAffinity:"before-markers"|"after-markers")=>{
      const pos={...paragraphOffsetToPosition(ps[i]!,offset),fieldBoundaryAffinity};
      return {...initial,selection:{anchor:pos,focus:pos}};
    };
    for(const blocked of [at(0,4,"after-markers"),at(0,9,"after-markers"),at(1,0,"before-markers"),at(1,4,"before-markers")]){
      expect(insertTextAtSelection(blocked,"X").document).toBe(initial.document);
    }
    for(const allowed of [at(0,4,"before-markers"),at(1,4,"after-markers")]){
      const edited=insertTextAtSelection(allowed,"X");
      expect(edited.document).not.toBe(initial.document);
      const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(edited.document));
      expect(fieldCharKinds(reopened)).toEqual(["begin","separate","end"]);
      expect(instructions(reopened)).toEqual([" TOC "]);
    }
  });
});
