import JSZip from "jszip";
import {describe,expect,it} from "vitest";
import {parseCoreDocumentProperties,parseCustomDocumentProperties,
  readPackageDocumentProperties,resolveDocumentProperty} from "@/ooxml/opc/documentProperties.js";
import {compileFieldInstruction,evaluateFieldInstruction} from "@/core/document/fieldEvaluation.js";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {exportEditorDocumentToDocxPreservingSource} from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";

const coreNs="http://schemas.openxmlformats.org/package/2006/metadata/core-properties";
const dc="http://purl.org/dc/elements/1.1/";
const custom="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties";
const vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes";
function field(id:string,raw:string,cache="old"):EditorParagraphNode{
  return {id,type:"paragraph",runs:[
    {id:id+"b",kind:"fieldChar",text:"",fieldChar:{kind:"begin"}},
    {id:id+"i",kind:"fieldInstruction",text:"",fieldInstruction:raw},
    {id:id+"s",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
    {id:id+"r",kind:"text",text:cache},
    {id:id+"e",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
  ]};
}
describe("F2B DOC PROPERTY source snapshots",()=>{
  it("reads unambiguous built-in core fields without interpreting XML markup",()=>{
    const xml='<cp:coreProperties xmlns:cp="'+coreNs+'" xmlns:dc="'+dc+'">'+
      '<dc:title>Processo &amp; Revisão</dc:title><dc:creator>PGE</dc:creator>'+
      '<dc:subject>Direito Público</dc:subject><dc:title>Duplicado</dc:title>'+
      '<cp:keywords>Fiscal</cp:keywords></cp:coreProperties>';
    const props=parseCoreDocumentProperties(xml);
    expect(props).toEqual({Author:"PGE",Subject:"Direito Público",Keywords:"Fiscal"});
    expect(resolveDocumentProperty({core:props},"AUTHOR")).toBe("PGE");
    expect(resolveDocumentProperty({core:props},"Title")).toBeUndefined();
    expect(parseCoreDocumentProperties(xml.replace("<cp:coreProperties","<!DOCTYPE unsafe><cp:coreProperties"))).toBeUndefined();
  });
  it("supports scalar custom text, boolean and bounded numbers; rejects ambiguous or unsupported values",()=>{
    const xml='<Properties xmlns="'+custom+'" xmlns:vt="'+vt+'">'+
      '<property name="Matter Code" pid="2"><vt:lpwstr>RJ &amp; 42</vt:lpwstr></property>'+
      '<property name="Enabled" pid="3"><vt:bool>1</vt:bool></property>'+
      '<property name="Budget" pid="4"><vt:r8>12.5</vt:r8></property>'+
      '<property name="Dup" pid="5"><vt:lpwstr>A</vt:lpwstr></property>'+
      '<property name="dup" pid="6"><vt:lpwstr>B</vt:lpwstr></property>'+
      '<property name="Picture" pid="7"><vt:blob>AA</vt:blob></property>'+
      '</Properties>';
    const props=parseCustomDocumentProperties(xml);
    expect(props).toEqual({"Matter Code":"RJ & 42",Enabled:"true",Budget:"12.5"});
    expect(resolveDocumentProperty({custom:props},"matter code")).toBe("RJ & 42");
    expect(resolveDocumentProperty({core:{Title:"Built in"},custom:{title:"Custom"}},"Title")).toBeUndefined();
  });
  it("qualifies DOCPROPERTY and preserves unknown or unsupported switches",()=>{
    const snapshot={core:{Title:"2026 Report"},custom:{"Matter Code":"AB-123"}};
    expect(evaluateFieldInstruction("DOCPROPERTY Title",{documentProperties:snapshot},"old"))
      .toMatchObject({status:"resolved",text:"2026 Report",dependencies:[{kind:"document-property",name:"title"}]});
    expect(evaluateFieldInstruction('DOCPROPERTY "Matter Code" \\* MERGEFORMAT',{documentProperties:snapshot},"old"))
      .toMatchObject({status:"resolved",text:"AB-123"});
    expect(evaluateFieldInstruction("DOCPROPERTY Missing",{documentProperties:snapshot},"old"))
      .toMatchObject({status:"preserved",reason:"unresolved",text:"old"});
    for(const raw of ["DOCPROPERTY","DOCPROPERTY Title extra","DOCPROPERTY Title \\* Unknown","DOCPROPERTY Title \\@ yyyy"]){
      expect(compileFieldInstruction(raw)).toBeUndefined();
    }
    expect(evaluateFieldInstruction("DOCPROPERTY Title",{documentProperties:snapshot},"old",true))
      .toMatchObject({status:"preserved",reason:"locked",text:"old"});
  });
  it("writes canonical core and custom OPC relationships and refreshes source body caches",async()=>{
    const doc=createEditorDocument([
      field("title","DOCPROPERTY Title"),
      field("matter",'DOCPROPERTY "Matter Code"'),
      field("bool","DOCPROPERTY Enabled"),
    ]);
    doc.documentProperties={core:{Title:"Processo & Parecer",Author:"PGE"},
      custom:{"Matter Code":"RJ-567",Enabled:"true"}};
    const bytes=await exportEditorDocumentToDocx(doc);
    const zip=await JSZip.loadAsync(bytes);
    const rootRels=await zip.file("_rels/.rels")?.async("string");
    const customXml=await zip.file("docProps/custom.xml")?.async("string");
    expect(rootRels).toContain("/custom-properties");
    expect(rootRels).toContain("/core-properties");
    expect(customXml).toContain('name="Matter Code"');
    expect((await zip.file("[Content_Types].xml")?.async("string"))).toContain("docProps/custom.xml");
    expect((await readPackageDocumentProperties(zip))?.core).toEqual({Title:"Processo & Parecer",Author:"PGE"});
    const imported=await importDocxToEditorDocument(bytes);
    expect(imported.documentProperties).toEqual(doc.documentProperties);
    const before=JSON.stringify(imported);
    const refreshed=refreshBodyFieldCaches(createEditorStateFromDocument(imported));
    expect(refreshed.status).toBe("updated");
    expect((getDocumentSections(refreshed.state.document)[0]!.blocks as EditorParagraphNode[]).map(p=>p.runs.map(r=>r.text).join("")))
      .toEqual(["Processo & Parecer","RJ-567","true"]);
    expect(JSON.stringify(imported)).toBe(before);
    expect(refreshBodyFieldCaches(refreshed.state).status).toBe("unchanged");
  });
  it("preserves original property parts in source-backed round trip",async()=>{
    const original=createEditorDocument([field("id","DOCPROPERTY Title")]);
    original.documentProperties={core:{Title:"Preservado"},custom:{Case:"42"}};
    const bytes=await exportEditorDocumentToDocx(original);
    const imported=await importDocxToEditorDocument(bytes);
    const result=await exportEditorDocumentToDocxPreservingSource(imported);
    const a=await JSZip.loadAsync(bytes),b=await JSZip.loadAsync(result);
    for(const path of ["docProps/core.xml","docProps/custom.xml"]){
      expect(await b.file(path)?.async("string")).toBe(await a.file(path)?.async("string"));
    }
    expect((await importDocxToEditorDocument(result)).documentProperties)
      .toEqual(imported.documentProperties);
  });
});
