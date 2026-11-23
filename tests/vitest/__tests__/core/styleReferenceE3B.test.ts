import {describe,expect,it} from "vitest";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {createStyleRefIndex} from "@/core/document/styleReference.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
import {projectDocumentLayout} from "@/layoutProjection/documentLayout.js";

const ref=(id:string,raw:string,cache="xxxxx"):EditorParagraphNode=>({
  id,type:"paragraph",runs:[
    {id:id+":b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"}},
    {id:id+":i",kind:"fieldInstruction",text:"",fieldInstruction:raw},
    {id:id+":s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
    {id:id+":r",kind:"text",text:cache},
    {id:id+":e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
  ],
});
const text=(p:EditorParagraphNode)=>p.runs.map(r=>r.text).join("");
const heading=(id:string,numbered=false):EditorParagraphNode=>({
  id,type:"paragraph",style:{styleId:"heading1"},
  ...(numbered?{list:{kind:"ordered" as const,instanceId:"chapters",level:0,format:"decimal" as const,levelText:"%1."}}:{}),
  runs:[{id:id+":r",kind:"text",text:"Capítulo"}],
});

describe("STYLEREF E3B — source-ordered character styles and numbering",()=>{
  it("references a character-styled phrase in the same paragraph via its precise offset",()=>{
    const p:EditorParagraphNode={id:"mixed",type:"paragraph",runs:[
      {id:"part",kind:"text",text:"Atlas",styles:{styleId:"char-term"}},
      {id:"blank",kind:"text",text:" "},
      ...ref("field",'STYLEREF "Term"',"cached").runs,
    ]};
    const doc=createEditorDocument([p]);
    doc.styles={...doc.styles,"char-term":{id:"char-term",name:"Term",type:"character"}};
    const idx=createStyleRefIndex(doc,projectDocumentLayout(doc));
    expect(idx.forBody("mixed","Term",false,{offset:6})).toBe("Atlas");
    const updated=refreshBodyFieldCaches(createEditorStateFromDocument(doc));
    expect(updated.status).toBe("updated");
    expect(text(getDocumentSections(updated.state.document)[0]!.blocks[0] as EditorParagraphNode)).toBe("Atlas Atlas");
    expect(refreshBodyFieldCaches(updated.state).status).toBe("unchanged");
  });
  it("projects the first and last character-style phrases onto the same-page header",()=>{
    const paragraph:EditorParagraphNode={id:"terms",type:"paragraph",runs:[
      {id:"first",kind:"text",text:"Atlas",styles:{styleId:"char-term"}},
      {id:"space",kind:"text",text:" "},
      {id:"last",kind:"text",text:"Omega",styles:{styleId:"char-term"}},
    ]};
    const doc=createEditorDocument([paragraph]);
    doc.styles={...doc.styles,"char-term":{id:"char-term",name:"Term",type:"character"}};
    const s=getDocumentSections(doc)[0]!;
    const prepared={...doc,sections:[{...s,header:[
      ref("head",'STYLEREF "Term"',"xxxxx"),
      ref("tail",'STYLEREF "Term" \\l',"yyyyy"),
    ]}]};
    const page=projectDocumentLayout(prepared).pages[0]!;
    expect(page.headerBlocks?.map(b=>b.layout?.text)).toEqual(["Atlas","Omega"]);
  });
  it("reads number from the ordered list counter and relative positions from source order",()=>{
    const doc=createEditorDocument([
      heading("chapter",true),
      ref("number",'STYLEREF "Heading 1" \\n',"x"),
      ref("position",'STYLEREF "Heading 1" \\p',"xxxxx"),
    ]);
    const idx=createStyleRefIndex(doc,projectDocumentLayout(doc));
    expect(idx.forBody("number","Heading 1",false,{output:"number"})).toBe("1");
    expect(idx.forBody("position","Heading 1",false,{output:"position"})).toBe("above");
    expect(idx.forBody("position","Heading 1",false,{output:"position",locale:"pt-BR"})).toBe("acima");
    const updated=refreshBodyFieldCaches(createEditorStateFromDocument(doc));
    expect(updated.status).toBe("updated");
    expect((getDocumentSections(updated.state.document)[0]!.blocks as EditorParagraphNode[]).map(text))
      .toEqual(["Capítulo","1","above"]);
    const plain=createEditorDocument([heading("chapter"),ref("number",'STYLEREF "Heading 1" \\n',"cache")]);
    expect(refreshBodyFieldCaches(createEditorStateFromDocument(plain)).status).toBe("unchanged");
  });
  it("distinguishes a later source and the relative side in header and footer",()=>{
    const doc=createEditorDocument([ref("before",'STYLEREF "Heading 1" \\p',"xxxxx"),heading("after")]);
    expect(createStyleRefIndex(doc,projectDocumentLayout(doc)).forBody(
      "before","Heading 1",false,{output:"position"})).toBe("below");
    const base=createEditorDocument([heading("target")]);
    const section=getDocumentSections(base)[0]!;
    const withStories={...base,sections:[{...section,
      header:[ref("header",'STYLEREF "Heading 1" \\p',"xxxxx")],
      footer:[ref("footer",'STYLEREF "Heading 1" \\p',"xxxxx")],
    }]};
    const page=projectDocumentLayout(withStories).pages[0]!;
    expect(page.headerBlocks?.[0]?.layout?.text).toBe("below");
    expect(page.footerBlocks?.[0]?.layout?.text).toBe("above");
  });
  it("preserves ambiguous custom styles and refuses variable-length shared header updates",()=>{
    const p:EditorParagraphNode={id:"p",type:"paragraph",runs:[
      {id:"t",kind:"text",text:"Long Title",styles:{styleId:"a"}},
    ]};
    const doc=createEditorDocument([p]);
    doc.styles={...doc.styles,a:{id:"a",name:"Word",type:"character"},
      b:{id:"b",name:"Word",type:"character"}};
    expect(createStyleRefIndex(doc,projectDocumentLayout(doc)).forPage(0,"Word")).toBeUndefined();
    const distinct={...doc,styles:{...doc.styles,b:{id:"b",name:"Different",type:"character" as const}}};
    const section=getDocumentSections(distinct)[0]!;
    const prepared={...distinct,sections:[{...section,header:[ref("header",'STYLEREF "Word"',"old")]}]};
    expect(projectDocumentLayout(prepared).pages[0]!.headerBlocks?.[0]?.layout?.text).toBe("old");
  });
});
