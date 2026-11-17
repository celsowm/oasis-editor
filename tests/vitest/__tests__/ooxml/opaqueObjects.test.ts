import { cloneRun } from "@/core/document/clone.js";
import { buildParagraphFragments, buildMeasuredChars } from "@/ui/textMeasurement/tokenizer.js";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import type { EditorDocxSourcePackage, EditorOpcPart } from "@/core/model/types/docxSourcePackage.js";
import { inspectDocxOpaqueObjects, auditOpaqueObjectPreservation, OpaqueObjectPreservationError } from "@/ooxml/word/opaqueObjects.js";
import { captureDocxSourcePackage } from "@/import/docx/opc/sourcePackage.js";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const P="http://schemas.openxmlformats.org/package/2006/relationships";
const C="http://schemas.openxmlformats.org/drawingml/2006/chart";
const CT="http://schemas.openxmlformats.org/package/2006/content-types";
const part=(path:string,data:string,extra:Partial<EditorOpcPart>={}):EditorOpcPart=>({path,kind:"xml",encoding:"utf8",data,originalHash:"fixture",...extra});
const drawing=`<wx:drawing><wp:inline><wp:extent cx="1905000" cy="952500"/><wp:docPr id="1" name="Chart"/><a:graphic><a:graphicData uri="${C}"><c:chart rel:id="rIdChart"/></a:graphicData></a:graphic></wp:inline></wx:drawing>`;
const root=(body:string)=>`<wx:document xmlns:wx="${W}" xmlns:rel="${R}" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:c="${C}"><wx:body><wx:p><wx:r><wx:t>Neighbor</wx:t></wx:r><wx:r>${body}</wx:r></wx:p><wx:sectPr/></wx:body></wx:document>`;
function source():EditorDocxSourcePackage{
  const a="word/document.xml",b="word/charts/chart1.xml",c="word/embeddings/book.xlsx";
  return {format:"docx",mainDocumentPart:a,contentTypes:{defaults:{},overrides:{}},rootRelationships:[],parts:{
    [a]:part(a,root(drawing),{relationships:[{id:"rIdChart",type:R+"/chart",target:"charts/chart1.xml",resolvedTarget:b}]}),
    [b]:part(b,`<c:chartSpace xmlns:c="${C}"/>`,{relationships:[{id:"rIdData",type:R+"/package",target:"../embeddings/book.xlsx",resolvedTarget:c},{id:"rIdExternal",type:R+"/externalLink",target:"https://example.invalid/data",targetMode:"External"}]}),
    [c]:part(c,"AQID",{kind:"binary",encoding:"base64",relationships:[{id:"rIdCycle",type:"urn:cycle",target:"../charts/chart1.xml",resolvedTarget:b}]})
  }};
}
describe("opaque source inventory and loss detector",()=>{
  it("records chart geometry, namespace-neutral IDs and transitive closure without following external targets or cycles",()=>{
    const s=source(),report=inspectDocxOpaqueObjects(s),o=report.objects[0]!;
    expect(report.objects).toHaveLength(1);
    expect(o.kind).toBe("chart");
    expect(o.geometry).toMatchObject({placement:"inline",widthEmu:1905000,heightEmu:952500});
    expect(o.relationshipIds).toEqual(["rIdChart"]);
    expect(o.partPaths).toEqual(["word/charts/chart1.xml","word/embeddings/book.xlsx"]);
    expect(o.edges).toHaveLength(4);
    expect(o.issues).toEqual([]);
    expect(o.fragmentXml).toContain(`xmlns:rel="${R}"`);
    expect(JSON.parse(JSON.stringify(o))).toEqual(JSON.parse(JSON.stringify(structuredClone(o))));
    expect(auditOpaqueObjectPreservation(s,structuredClone(s))).toEqual([]);
  });
  it("detects removed objects, missing targets, changed payloads and duplicate multiplicity",()=>{
    const s=source(),copy=structuredClone(s);
    copy.parts["word/embeddings/book.xlsx"]!.data="BAUG";
    expect(auditOpaqueObjectPreservation(s,copy).map(d=>d.code)).toContain("opaque-target-content-changed");
    delete copy.parts["word/embeddings/book.xlsx"];
    expect(auditOpaqueObjectPreservation(s,copy).map(d=>d.code)).toContain("opaque-target-missing");
    copy.parts["word/document.xml"]!.data=root("");
    expect(auditOpaqueObjectPreservation(s,copy).map(d=>d.code)).toContain("opaque-object-changed-or-missing");
    const two=source();two.parts["word/document.xml"]!.data=root(drawing+drawing);
    expect(auditOpaqueObjectPreservation(two,s).map(d=>d.code)).toContain("opaque-object-changed-or-missing");
  });
  it("keeps a complete alternate-content wrapper and ignores foreign same-name elements",()=>{
    const s=source();
    const mc="http://schemas.openxmlformats.org/markup-compatibility/2006";
    s.parts["word/document.xml"]!.data=root(`<mc:AlternateContent xmlns:mc="${mc}" xmlns:future="urn:future"><mc:Choice Requires="future">${drawing}</mc:Choice><mc:Fallback><wx:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml"/></wx:pict></mc:Fallback></mc:AlternateContent><fake:drawing xmlns:fake="urn:fake"/>`);
    const report=inspectDocxOpaqueObjects(s);
    expect(report.objects).toHaveLength(1);
    expect(report.objects[0]!.fragmentXml).toContain("mc:Fallback");
    expect(report.objects[0]!.fragmentXml).toContain('xmlns:future="urn:future"');
  });
  it("captures an actual package and retains a standalone chart through a source-backed neighboring edit",async()=>{
    const zip=new JSZip();
    zip.file("[Content_Types].xml",`<Types xmlns="${CT}"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>`);
    zip.file("_rels/.rels",`<Relationships xmlns="${P}"><Relationship Id="rIdOffice" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file("word/document.xml",root(drawing));
    zip.file("word/_rels/document.xml.rels",`<Relationships xmlns="${P}"><Relationship Id="rIdChart" Type="${R}/chart" Target="charts/chart1.xml"/></Relationships>`);
    zip.file("word/charts/chart1.xml",`<c:chartSpace xmlns:c="${C}"/>`);
    const buffer=await zip.generateAsync({type:"arraybuffer"});
    const doc=await importDocxInWorker(buffer);
    expect(doc.sourcePackage?.opaqueObjects?.[0]?.kind).toBe("chart");
    const p=doc.sections?.[0]?.blocks[0];
    if(p?.type!=="paragraph")throw Error("Expected source paragraph");
    p.runs[0]!.text="Changed neighbor";
    const opaque=p.runs.find(r=>r.kind==="opaque")!;
    expect(opaque).toMatchObject({kind:"opaque",text:"\uFFFC",opaque:{objectKind:"chart",width:200,height:100}});
    const cloned=cloneRun(opaque);
    expect(cloned).toEqual(opaque);
    expect(cloned).not.toBe(opaque);
    const fragment=buildParagraphFragments(p).find(f=>f.runId===opaque.id)!;
    expect(fragment.opaque?.width).toBe(200);
    const measured=buildMeasuredChars(p,buildParagraphFragments(p),doc.styles);
    expect(measured.find(c=>c.char==="\uFFFC")).toMatchObject({width:200,objectHeight:100});
    await expect(exportEditorDocumentToDocx(doc)).rejects.toThrow(/source-backed/);
    const strict=await exportEditorDocumentToDocxPreservingSource(doc,{requireOpaquePreservation:true});
    expect(auditOpaqueObjectPreservation(doc.sourcePackage!,await captureDocxSourcePackage(strict))).toEqual([]);
    const roundtrip=await importDocxInWorker(strict);
    const paragraph=roundtrip.sections?.[0]?.blocks[0];
    if(paragraph?.type!=="paragraph")throw Error("Expected round-trip paragraph");
    expect(paragraph.runs.some(r=>r.kind==="opaque")).toBe(true);
    expect(paragraph.runs.map(r=>r.text).join("")).toContain("Changed neighbor");
    p.runs=p.runs.filter(r=>r.kind!=="opaque");
    await expect(exportEditorDocumentToDocxPreservingSource(doc)).rejects.toBeInstanceOf(OpaqueObjectPreservationError);
  },30000);
});
