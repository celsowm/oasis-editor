import { describe, expect, it } from "vitest";
import { compileFieldInstruction, evaluateFieldInstruction, evaluateScalarFieldSpan } from "@/core/document/fieldEvaluation.js";
import { buildFieldStoryGraph } from "@/core/document/fieldStoryGraph.js";
import type { EditorParagraphNode } from "@/core/model.js";

describe("bounded OOXML field evaluation", () => {
  const context = { pageNumber: 7, totalPages: 12, sectionNumber: 2, sectionPages: 5,
    bookmarkText: (name: string) => name === "Target" ? "Hello" : name === "Empty" ? "" : null,
    bookmarkPage: (name: string) => name === "Target" ? 9 : null };
  it.each([
    [" PAGE ", "7", "page"], ["NUMPAGES", "12", "document-pages"],
    ["SECTION", "2", "section"], ["SECTIONPAGES", "5", "section-pages"],
    ["PAGE \\* ROMAN", "VII", "page"], ["NUMPAGES \\* roman", "xii", "document-pages"],
  ])("evaluates %s with an explicit dependency", (raw, expected, dependency) => {
    expect(evaluateFieldInstruction(raw, context, "cache")).toEqual({
      status: "resolved", text: expected, dependencies: [{kind: dependency}],
    });
  });
  it("distinguishes empty, missing and unresolved bookmarks", () => {
    expect(evaluateFieldInstruction('REF "Target" \\h', context, "old")).toEqual({
      status:"resolved",text:"Hello",dependencies:[{kind:"bookmark-text",name:"Target"}],
    });
    expect(evaluateFieldInstruction("PAGEREF Target",context,"old")).toEqual({
      status:"resolved",text:"9",dependencies:[{kind:"bookmark-page",name:"Target"}],
    });
    expect(evaluateFieldInstruction("REF Empty",context,"cache").text).toBe("");
    expect(evaluateFieldInstruction("REF Missing",context,"cache")).toMatchObject({status:"error",reason:"missing-bookmark"});
    expect(evaluateFieldInstruction("REF Target",{},"cache")).toMatchObject({status:"preserved",reason:"unresolved",text:"cache"});
  });
  it("does not execute unsupported or malformed fields, locked fields or invalid numbers", () => {
    for(const raw of ['IF PAGE = 1 "yes" "no"', 'DDE application', 'INCLUDETEXT "file"', 'PAGE \\* MERGEFORMAT', 'REF Target \\p', 'PAGEREF Target extra']){
      expect(compileFieldInstruction(raw)).toBeUndefined();
      expect(evaluateFieldInstruction(raw,context,"cache")).toMatchObject({status:"preserved",reason:"unsupported",text:"cache"});
    }
    expect(evaluateFieldInstruction('REF "unclosed',context,"cache")).toMatchObject({reason:"malformed",text:"cache"});
    expect(evaluateFieldInstruction("PAGE",context,"cache",true)).toMatchObject({reason:"locked",text:"cache"});
    for(const pageNumber of [undefined,NaN,Infinity,0,-1,1.5,1e10]){
      expect(evaluateFieldInstruction("PAGE \\* ROMAN",{pageNumber},"cache")).toMatchObject({reason:"unresolved",text:"cache"});
    }
  });
  it("evaluates only scalar spans without mutating cached run data or flags",()=>{
    const p:EditorParagraphNode={id:"p",type:"paragraph",runs:[
      {id:"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin",dirty:true}},
      {id:"i1",kind:"fieldInstruction",text:"",fieldInstruction:" PA"},
      {id:"i2",kind:"fieldInstruction",text:"",fieldInstruction:"GE "},
      {id:"s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
      {id:"r",kind:"text",text:"1"},
      {id:"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
    ]};
    const graph=buildFieldStoryGraph([p]),span=graph.spans[0]!;
    const snapshot=JSON.stringify(graph);
    expect(evaluateScalarFieldSpan(span,context,"1")).toMatchObject({status:"resolved",text:"7"});
    expect(JSON.stringify(graph)).toBe(snapshot);
    expect(p.runs[4]!.text).toBe("1");
    expect(evaluateScalarFieldSpan({...span,beginMarker:{kind:"begin",fieldLock:true}},context,"1")).toMatchObject({reason:"locked",text:"1"});
    expect(evaluateScalarFieldSpan({...span,code:[{kind:"nested",fieldIndex:1}]},context,"1")).toMatchObject({reason:"structured",text:"1"});
  });
});
