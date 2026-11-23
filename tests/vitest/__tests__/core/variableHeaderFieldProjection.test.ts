import {describe,expect,it} from "vitest";
import {createEditorDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";
import {buildDisplayOffsetMap,displayOffsetToSource} from "@/layoutProjection/fieldDisplayOffsetMap.js";
import {toSnapshotLines} from "@/ui/canvas/canvasSnapshotLines.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const heading=(id:string,text:string):EditorParagraphNode=>({
  id,type:"paragraph",style:{styleId:"heading1"},
  runs:[{id:id+":t",kind:"text",text}],
});
const headerField=(cache="x",locked=false):EditorParagraphNode=>({
  id:"shared-header",type:"paragraph",runs:[
    {id:"begin",kind:"fieldChar",text:"",fieldChar:{kind:"begin",fieldLock:locked}},
    {id:"code",kind:"fieldInstruction",text:"",fieldInstruction:' STYLEREF "Heading 1" '},
    {id:"sep",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
    {id:"value",kind:"text",text:cache},
    {id:"end",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
  ],
});
describe("source-aligned variable-length running header display",()=>{
  it("maps the visual caret back to real DOCX field boundaries",()=>{
    const map=buildDisplayOffsetMap([2,1,2],[2,8,2]);
    expect(map).toEqual([{displayStart:2,displayEnd:10,sourceStart:2,sourceEnd:3}]);
    expect([0,1,2,3,9,10,11,12].map(n=>displayOffsetToSource(n,map)))
      .toEqual([0,1,2,2,2,3,4,5]);
    const lines=[{startOffset:0,endOffset:12,top:0,height:20,
      slots:Array.from({length:13},(_,offset)=>({offset,left:offset*7,top:0,height:20}))}];
    const snapshot=toSnapshotLines(lines,10,5,map);
    expect(snapshot[0]!.endOffset).toBe(5);
    expect(snapshot[0]!.slots[0]!.offset).toBe(0);
    expect(snapshot[0]!.slots[9]!.offset).toBe(2);
    expect(snapshot[0]!.slots[10]!.offset).toBe(3);
    expect(snapshot[0]!.slots[12]!.offset).toBe(5);
    expect(snapshot[0]!.slots[12]!.left).toBe(94);
  });
  it("projects different-length titles on two physical pages without rewriting a shared header",async()=>{
    const header=headerField("x");
    const doc=createEditorDocument([heading("a","Alpha")]);
    const section=getDocumentSections(doc)[0]!;
    const second={...section,id:"chapter-two",blocks:[heading("b","Chapter Two")],breakType:"nextPage" as const,header:[header]};
    const prepared={...doc,sections:[{...section,header:[header]},second]};
    const snapshot=JSON.stringify(prepared);
    const layout=projectDocumentLayout(prepared);
    expect(layout.pages).toHaveLength(2);
    const first=layout.pages[0]!.headerBlocks?.[0]!.layout;
    const next=layout.pages[1]!.headerBlocks?.[0]!.layout;
    expect(first?.text).toBe("Alpha");
    expect(next?.text).toBe("Chapter Two");
    expect(first?.displayOffsetMap).toEqual([{displayStart:0,displayEnd:5,sourceStart:0,sourceEnd:1}]);
    expect(next?.displayOffsetMap).toEqual([{displayStart:0,displayEnd:11,sourceStart:0,sourceEnd:1}]);
    expect(first?.lines).toHaveLength(1);
    expect(next?.lines).toHaveLength(1);
    const remapped=toSnapshotLines(next!.lines,0,0,next!.displayOffsetMap);
    expect(remapped[0]!.startOffset).toBe(0);
    expect(remapped[0]!.endOffset).toBe(1);
    expect(remapped[0]!.slots.at(-1)?.offset).toBe(1);
    expect(JSON.stringify(prepared)).toBe(snapshot);
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(prepared));
    const persisted=getDocumentSections(reopened)[0]!.header![0] as EditorParagraphNode;
    expect(persisted.runs.map(r=>r.text).join("")).toBe("x");
  });
  it("keeps unknown, locked and multi-line replacements cached",()=>{
    const locked=headerField("x",true);
    const ordinary=createEditorDocument([heading("title","Longer Text")]);
    const section=getDocumentSections(ordinary)[0]!;
    const doc={...ordinary,sections:[{...section,header:[locked]}]};
    const projected=projectDocumentLayout(doc);
    expect(projected.pages[0]!.headerBlocks?.[0]?.layout?.text).toBe("x");
    expect(projected.pages[0]!.headerBlocks?.[0]?.layout?.displayOffsetMap).toBeUndefined();
    const huge={...ordinary,sections:[{...section,blocks:[heading("title","Long ".repeat(200))],
      header:[headerField("x")]}]};
    const fallback=projectDocumentLayout(huge);
    expect(fallback.pages[0]!.headerBlocks?.[0]?.layout?.text).toBe("x");
  });
});
