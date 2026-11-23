import { getRunImage, getRunTextBox, getRunField, getRunFieldChar, getRunFieldInstruction, getRunFootnoteReference, getRunEndnoteReference, getRunSym } from "@/core/model.js";
import { describe, expect, it } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorParagraphFromRuns,
  createEditorStateFromDocument,
} from "@/core/editorState.js";
import {
  getSelectedImageCaption,
  setSelectedImageCaption,
} from "@/core/commands/image.js";
import { createImageCaptionParagraph, renumberImageCaptionsInDocument } from "@/core/document/imageCaptions.js";
import {
  getParagraphs,
  getDocumentSections,
  paragraphOffsetToPosition,
  type EditorImageRunData,
  type EditorParagraphNode,
  type EditorTableNode,
  type EditorState,
} from "@/core/model.js";

const image: EditorImageRunData = {
  src: "data:image/png;base64,AAAA",
  width: 120,
  height: 80,
};

function selectImage(state: EditorState, paragraph: EditorParagraphNode) {
  return {
    ...state,
    selection: {
      anchor: paragraphOffsetToPosition(paragraph, 0),
      focus: paragraphOffsetToPosition(paragraph, 1),
    },
  };
}

function stateWithSelectedImage() {
  const paragraph = createEditorParagraphFromRuns([{ text: "\uFFFC", image }]);
  return selectImage(
    createEditorStateFromDocument(createEditorDocument([paragraph])),
    paragraph,
  );
}

function textOf(paragraph: EditorParagraphNode) {
  return paragraph.runs.map((run) => run.text).join("");
}

describe("image captions", () => {
  it("inserts a visible Caption paragraph with a Word SEQ field", () => {
    const next = setSelectedImageCaption(
      stateWithSelectedImage(),
      "Vista geral",
      "Figura",
    );

    const paragraphs = getParagraphs(next);
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[1]!.style?.styleId).toBe("Caption");
    expect(textOf(paragraphs[1]!)).toBe("Figura 1: Vista geral");
    expect(
      paragraphs[1]!.runs.map((run) => getRunFieldChar(run)?.kind).filter(Boolean),
    ).toEqual(["begin", "separate", "end"]);
    expect(
      paragraphs[1]!.runs.some((run) =>
        getRunFieldInstruction(run)?.includes("SEQ Figure \\* ARABIC"),
      ),
    ).toBe(true);
  });

  it("updates an adjacent generated caption instead of duplicating it", () => {
    const inserted = setSelectedImageCaption(
      stateWithSelectedImage(),
      "Primeira legenda",
      "Figura",
    );
    const imageParagraph = getParagraphs(inserted)[0]!;
    const selectedAgain = selectImage(inserted, imageParagraph);
    const updated = setSelectedImageCaption(
      selectedAgain,
      "Legenda revisada",
      "Figura",
    );

    const paragraphs = getParagraphs(updated);
    expect(paragraphs).toHaveLength(2);
    expect(textOf(paragraphs[1]!)).toBe("Figura 1: Legenda revisada");
    expect(getSelectedImageCaption(selectImage(updated, paragraphs[0]!))).toBe(
      "Legenda revisada",
    );
  });

  it("renumbers multiple image captions in document order", () => {
    const firstImage = createEditorParagraphFromRuns([
      { text: "\uFFFC", image },
    ]);
    const secondImage = createEditorParagraphFromRuns([
      { text: "\uFFFC", image },
    ]);
    const state = createEditorStateFromDocument(
      createEditorDocument([firstImage, secondImage]),
    );

    const withFirst = setSelectedImageCaption(
      selectImage(state, firstImage),
      "Primeira",
      "Figura",
    );
    const secondImageAfterInsert = getParagraphs(withFirst)[2]!;
    const withSecond = setSelectedImageCaption(
      selectImage(withFirst, secondImageAfterInsert),
      "Segunda",
      "Figura",
    );

    const captions = getParagraphs(withSecond).filter(
      (paragraph) => paragraph.style?.styleId === "Caption",
    );
    expect(captions.map(textOf)).toEqual([
      "Figura 1: Primeira",
      "Figura 2: Segunda",
    ]);
  });

  it("updates an imported-style Caption paragraph next to the selected image", () => {
    const imageParagraph = createEditorParagraphFromRuns([
      { text: "\uFFFC", image },
    ]);
    const caption = createEditorParagraph("Figure 7: Old caption");
    caption.style = { styleId: "Caption" };
    caption.runs = [
      { id: "r1", text: "Figure ", kind: "text" as const },
      { id: "r2", text: "", kind: "fieldChar", fieldChar: { kind: "begin" } },
      {
        id: "r3",
        text: "",
        kind: "fieldInstruction",
        fieldInstruction: " SEQ Figure \\* ARABIC ",
      },
      {
        id: "r4",
        text: "",
        kind: "fieldChar",
        fieldChar: { kind: "separate" },
      },
      { id: "r5", text: "7", kind: "text" as const },
      { id: "r6", text: "", kind: "fieldChar", fieldChar: { kind: "end" } },
      { id: "r7", text: ": Old caption", kind: "text" as const },
    ];
    const state = selectImage(
      createEditorStateFromDocument(
        createEditorDocument([imageParagraph, caption]),
      ),
      imageParagraph,
    );

    const next = setSelectedImageCaption(state, "Nova legenda", "Figura");

    expect(getParagraphs(next)).toHaveLength(2);
    expect(textOf(getParagraphs(next)[1]!)).toBe("Figura 1: Nova legenda");
  });
});

describe("unified SEQ caption numbering",()=>{
  const seq=(id:string,code:string,text="99",locked=false):EditorParagraphNode=>({
    id,type:"paragraph",runs:[
      {id:id+":b",kind:"fieldChar",text:"",fieldChar:{kind:"begin",fieldLock:locked}},
      {id:id+":i",kind:"fieldInstruction",text:"",fieldInstruction:code},
      {id:id+":s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
      {id:id+":r",kind:"text",text},
      {id:id+":e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
    ],
  });
  it("uses external Figure occurrences and reset values, without counting Tables",()=>{
    const other=seq("figure","SEQ Figure","1");
    const reset={...seq("reset","SEQ Figure \\r 8","8"),style:{styleId:"Caption"}};
    const table=seq("table","SEQ Table","1");
    const caption=createImageCaptionParagraph("Depois","Figura",1);
    const document=createEditorDocument([other,table,reset,caption]);
    const before=JSON.stringify(document);
    const projected=renumberImageCaptionsInDocument(document);
    const ps=getDocumentSections(projected)[0]!.blocks as EditorParagraphNode[];
    expect(ps.map(p=>p.runs.map(r=>r.text).join(""))).toEqual(["1","1","8","Figura 9: Depois"]);
    expect(JSON.stringify(document)).toBe(before);
    expect(renumberImageCaptionsInDocument(projected)).toBe(projected);
  });
  it("counts prior cell Figure sequences and leaves cell source unchanged",()=>{
    const table:EditorTableNode={id:"tbl",type:"table",rows:[{id:"r",cells:[{id:"c",blocks:[seq("in","SEQ Figure","1")]}]}]};
    const caption=createImageCaptionParagraph("Depois","Figura",1);
    const projected=renumberImageCaptionsInDocument(createEditorDocument([table,caption]));
    const blocks=getDocumentSections(projected)[0]!.blocks;
    expect((blocks[1] as EditorParagraphNode).runs.map(r=>r.text).join("")).toBe("Figura 2: Depois");
    expect((blocks[0] as EditorTableNode).rows[0]!.cells[0]!.blocks[0]).toBe(table.rows[0]!.cells[0]!.blocks[0]);
  });
  it("edits label and prose but retains imported SEQ reset, lock and result IDs",()=>{
    const picture=createEditorParagraphFromRuns([{text:"\uFFFC",image}]);
    const caption=createImageCaptionParagraph("Antes","Figura",12);
    caption.runs=caption.runs.map(r=>r.kind==="fieldInstruction"?
      {...r,fieldInstruction:" SEQ Figure \\r 12 "}:r.kind==="fieldChar"&&r.fieldChar.kind==="begin"?
      {...r,fieldChar:{...r.fieldChar,fieldLock:true}}:r);
    const fieldRuns=caption.runs.slice(1,-1);
    const before=selectImage(createEditorStateFromDocument(createEditorDocument([picture,caption])),picture);
    const after=setSelectedImageCaption(before,"Depois","Ilustração");
    const updated=getParagraphs(after)[1]!;
    expect(updated.runs.map(r=>r.text).join("")).toBe("Ilustração 12: Depois");
    expect(updated.runs.slice(1,-1)).toEqual(fieldRuns);
  });
  it("refuses to rewrite an imported unsupported SEQ instruction",()=>{
    const picture=createEditorParagraphFromRuns([{text:"\uFFFC",image}]);
    const caption=createImageCaptionParagraph("Antes","Figura",77);
    caption.runs=caption.runs.map(r=>r.kind==="fieldInstruction"?{...r,fieldInstruction:" SEQ Figure \\h "}:r);
    const initial=selectImage(createEditorStateFromDocument(createEditorDocument([picture,caption])),picture);
    expect(setSelectedImageCaption(initial,"Depois","Figura")).toBe(initial);
    expect(renumberImageCaptionsInDocument(initial.document)).toBe(initial.document);
  });
});
