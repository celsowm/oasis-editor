import {describe,expect,it} from "vitest";
import JSZip from "jszip";
import {createEditorDocument,createEditorStateFromDocument} from "@/core/editorState.js";
import {getDocumentSections,type EditorParagraphNode} from "@/core/model.js";
import {exportEditorDocumentToDocx} from "@/export/docx/exportEditorDocumentToDocx.js";
import {exportEditorDocumentToDocxPreservingSource} from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import {importDocxToEditorDocument} from "@/import/docx/importDocxToEditorDocument.js";
import {attachDocxSourcePackage} from "@/import/docx/opc/sourcePackage.js";
import {parseCoreTimestamp,parseCoreTimestamps} from "@/ooxml/opc/coreProperties.js";
import {recordConfirmedDocumentEvent} from "@/core/document/documentLifecycle.js";
import {refreshBodyFieldCaches} from "@/layoutProjection/bodyFieldCacheRefresh.js";

const created=Date.UTC(2020,0,2),saved=Date.UTC(2025,5,6),printed=Date.UTC(2026,10,9);
const p:EditorParagraphNode={id:"p",type:"paragraph",runs:[
  {id:"begin",kind:"fieldChar",text:"",fieldChar:{kind:"begin"}},
  {id:"instr",kind:"fieldInstruction",text:"",fieldInstruction:'CREATEDATE \\@ "yyyy-MM-dd"'},
  {id:"sep",kind:"fieldChar",text:"",fieldChar:{kind:"separate"}},
  {id:"result",kind:"text",text:"old"},
  {id:"end",kind:"fieldChar",text:"",fieldChar:{kind:"end"}},
]};
describe("core properties lifecycle timestamps",()=>{
  it("round-trips actual timestamps without reading the clock",async()=>{
    const base=createEditorDocument([p]);
    const doc={...base,coreTimestamps:{created,saved,printed}};
    const reopened=await importDocxToEditorDocument(await exportEditorDocumentToDocx(doc));
    expect(reopened.coreTimestamps).toEqual({created,saved,printed});
    const result=refreshBodyFieldCaches(createEditorStateFromDocument(reopened));
    expect(result.status).toBe("updated");
    expect((getDocumentSections(result.state.document)[0]!.blocks[0] as EditorParagraphNode).runs.map(r=>r.text).join("")).toBe("2020-01-02");
    expect((await importDocxToEditorDocument(await exportEditorDocumentToDocx(base))).coreTimestamps).toBeUndefined();
  });
  it("keeps unrelated metadata and nonstandard OPC path, changing only confirmed timestamps",async()=>{
    const zip=await JSZip.loadAsync(await exportEditorDocumentToDocx({...createEditorDocument([p]),coreTimestamps:{created,saved}}));
    const path="metadata/properties.xml";
    const xml=(await zip.file("docProps/core.xml")!.async("string")).replace("</cp:coreProperties>","<cp:keywords>keep me</cp:keywords></cp:coreProperties>");
    zip.remove("docProps/core.xml");zip.file(path,xml);
    for(const part of ["_rels/.rels","[Content_Types].xml"]){
      zip.file(part,(await zip.file(part)!.async("string")).replaceAll("docProps/core.xml",path));
    }
    const bytes=await zip.generateAsync({type:"arraybuffer"});
    const doc=await attachDocxSourcePackage(await importDocxToEditorDocument(bytes),bytes);
    expect(doc.coreTimestamps).toEqual({created,saved});
    const untouched=await JSZip.loadAsync(await exportEditorDocumentToDocxPreservingSource(doc));
    expect(await untouched.file(path)!.async("string")).toBe(xml);
    const updated=recordConfirmedDocumentEvent(doc,"printed",printed);
    const output=await JSZip.loadAsync(await exportEditorDocumentToDocxPreservingSource(updated));
    const changed=await output.file(path)!.async("string");
    expect(changed).toContain("keep me");
    expect(parseCoreTimestamps(changed)).toEqual({created,saved,printed});
    expect(output.file("docProps/core.xml")).toBeNull();
    expect(doc.sourcePackage?.parts[path]?.data).toBe(xml);
    expect(doc.coreTimestamps).toEqual({created,saved});
  });
  it("rejects impossible dates, unqualified timezone and invalid events",()=>{
    for(const text of ["2026-02-30T00:00:00Z","2026-01-01T00:00:00","2026-01-01T25:00:00Z","2026-01-01T12:00:00+14:01"]){
      expect(parseCoreTimestamp(text)).toBeUndefined();
    }
    const doc=createEditorDocument([p]);
    expect(recordConfirmedDocumentEvent(doc,"saved",NaN)).toBe(doc);
    const first=recordConfirmedDocumentEvent(doc,"created",created);
    expect(recordConfirmedDocumentEvent(first,"created",saved)).toBe(first);
  });
});
