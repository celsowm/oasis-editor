import { createEditorClipboardController } from "@/app/controllers/useEditorClipboard.js";
import { OPAQUE_CHART_CLIPBOARD_TYPE } from "@/app/clipboard/opaqueChartClipboard.js";
import { getParagraphs } from "@/core/model.js";
import { captureSelectedOpaqueChart, prepareOpaqueChartPaste } from "@/app/controllers/opaqueTransferTransaction.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { paragraphOffsetToPosition } from "@/core/model.js";
import { deleteBackward, deleteForward } from "@/core/commands/text.js";
import { createEmptyEditorHistoryState, applyEditorHistoryTransaction, takeEditorUndoStep, takeEditorRedoStep } from "@/ui/editorHistory.js";
import { planOpaqueDependencyPruning } from "@/export/docx/opc/opaqueDependencyPruning.js";
import { planOpaqueStoryRelocation } from "@/export/docx/opc/opaqueStoryRelocation.js";
import { applyTextDragDrop } from "@/app/controllers/useEditorTextDrag.js";
import { moveOrCopySelectionToPosition, relocateSelectedOpaqueObject } from "@/core/commands/text.js";
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
import { captureOpaqueTransferManifest, validateOpaqueTransferManifest } from "@/ooxml/word/opaqueTransferManifest.js";

import { planOpaqueTransferInsertion } from "@/ooxml/word/opaqueTransferInsertion.js";

import { applyOpaqueTransferToDocx } from "@/export/docx/opc/applyOpaqueTransferToDocx.js";

describe("opaque source inventory and loss detector",()=>{
  it("applies a chart transfer to real DOCX bytes, preserves originals and supports repeated insertion",async()=>{
    const chartPath="word/charts/chart1.xml",bookPath="word/embeddings/book.xlsx";
    const make=async(label:string,bookValue:string,withChart:boolean)=>{
      const zip=new JSZip();
      const rel=(id:string,type:string,target:string)=>'<Relationship Id="'+id+'" Type="'+R+'/'+type+'" Target="'+target+'"/>';
      const rels=(body:string)=>'<Relationships xmlns="'+P+'">'+body+'</Relationships>';
      zip.file("[Content_Types].xml",'<Types xmlns="'+CT+'"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="bin" ContentType="application/octet-stream"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'+(withChart?'<Override PartName="/'+chartPath+'" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/><Override PartName="/'+bookPath+'" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"/>':'')+'</Types>');
      zip.file("_rels/.rels",rels(rel("rIdOffice","officeDocument","word/document.xml")));
      zip.file("word/document.xml",root(withChart?drawing:"<wx:t>Empty destination</wx:t>").replace("Neighbor",label));
      zip.file("custom/unrelated.bin",new Uint8Array([0,255,7,19]));
      if(withChart){
        zip.file("word/_rels/document.xml.rels",rels(rel("rIdChart","chart","charts/chart1.xml")));
        zip.file(chartPath,'<c:chartSpace xmlns:c="'+C+'" xmlns:rel="'+R+'"><c:externalData rel:id="rIdData"/></c:chartSpace>');
        zip.file("word/charts/_rels/chart1.xml.rels",rels(rel("rIdData","package","../embeddings/book.xlsx")));
        const workbook=new JSZip();
        workbook.file("[Content_Types].xml",'<Types xmlns="'+CT+'"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>');
        workbook.file("_rels/.rels",rels(rel("rIdOffice","officeDocument","xl/workbook.xml")));
        workbook.file("xl/workbook.xml",'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'+R+'"><sheets><sheet name="Data" sheetId="1" r:id="rIdSheet"/></sheets></workbook>');
        workbook.file("xl/_rels/workbook.xml.rels",rels(rel("rIdSheet","worksheet","worksheets/sheet1.xml")));
        workbook.file("xl/worksheets/sheet1.xml",'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>'+bookValue+'</t></is></c></row></sheetData></worksheet>');
        zip.file(bookPath,await workbook.generateAsync({type:"uint8array"}));
      }
      return zip.generateAsync({type:"arraybuffer"});
    };
    const sourceBytes=await make("Source","Original workbook",true);
    const destinationBytes=await make("Destination","Different workbook",true);
    const source=await captureDocxSourcePackage(sourceBytes),destination=await captureDocxSourcePackage(destinationBytes);
    const manifest=captureOpaqueTransferManifest(source,source.opaqueObjects![0]!);
    const pristine=destinationBytes.slice(0);
    const first=await applyOpaqueTransferToDocx(destinationBytes,manifest,0);
    expect(new Uint8Array(destinationBytes)).toEqual(new Uint8Array(pristine));
    const actual=await captureDocxSourcePackage(first.buffer);
    expect(actual.opaqueObjects).toHaveLength(2);
    expect(actual.parts[bookPath]!.data).toBe(destination.parts[bookPath]!.data);
    const copiedBook=first.plan.pathMapping.find(p=>p.from===bookPath)!.to;
    expect(actual.parts[copiedBook]!.data).toBe(source.parts[bookPath]!.data);
    expect(actual.parts["custom/unrelated.bin"]!.data).toBe(destination.parts["custom/unrelated.bin"]!.data);
    expect(actual.parts[chartPath]!.data).toBe(destination.parts[chartPath]!.data);
    expect(actual.opaqueObjects!.map(o=>o.signature)).toEqual(expect.arrayContaining([destination.opaqueObjects![0]!.signature,first.plan.destinationRun.signature]));
    // Prepare a real model transaction from a caret in the middle of text.
    // A previous ordinary edit must survive; undo must restore the exact old
    // state and OPC snapshot rather than leave imported dependencies behind.
    const target=await importDocxInWorker(destinationBytes);
    const p=target.sections?.[0]?.blocks[0];
    if(p?.type!=="paragraph")throw Error("Expected target paragraph");
    p.runs.find(r=>r.text==="Destination")!.text="Changed destination";
    const initial=createEditorStateFromDocument(target);
    const caret=paragraphOffsetToPosition(p,7);
    const state={...initial,selection:{anchor:caret,focus:caret}};
    const snapshot=structuredClone(state.document.sourcePackage);
    const prepared=await prepareOpaqueChartPaste(state,manifest);
    expect(state.document.sourcePackage).toEqual(snapshot);
    expect(prepared.document.sourcePackage).not.toBe(state.document.sourcePackage);
    // Every original run must be bound to an exact fresh source fragment
    // after the namespace scope changed during the preflight export.
    const originalRun=p.runs.find(r=>r.kind==="opaque")!;
    expect(originalRun.kind).toBe("opaque");
    const preparedParagraph=prepared.document.sections?.[0]?.blocks[0];
    if(preparedParagraph?.type!=="paragraph")throw Error("Expected prepared paragraph");
    const freshObjects=inspectDocxOpaqueObjects(prepared.document.sourcePackage!).objects;
    for(const r of preparedParagraph.runs){
      if(r.kind!=="opaque")continue;
      const matched=freshObjects.filter(o=>o.signature===r.opaque.signature);
      expect(matched).toHaveLength(1);
      expect(r.opaque.fragmentXml).toBe(matched[0]!.fragmentXml);
      expect(r.opaque.relationshipIds).toEqual(matched[0]!.relationshipIds);
    }
    expect(p.runs.find(r=>r.kind==="opaque")).toBe(originalRun);
    const edited=prepared.document.sections?.[0]?.blocks[0];
    if(edited?.type!=="paragraph")throw Error("Expected edited paragraph");
    expect(edited.id).toBe(p.id);
    expect(edited.runs.map(r=>r.text).join("")).toBe("Changed\uFFFC destination\uFFFC");
    const saved=await exportEditorDocumentToDocxPreservingSource(prepared.document);
    const reimported=await importDocxInWorker(saved);
    const rp=reimported.sections?.[0]?.blocks[0];
    expect(rp?.type==="paragraph"&&rp.runs.map(r=>r.text).join("")).toBe("Changed\uFFFC destination\uFFFC");
    const pastedPackage=await captureDocxSourcePackage(saved);
    expect(pastedPackage.opaqueObjects).toHaveLength(2);
    expect(pastedPackage.parts[bookPath]!.data).toBe(destination.parts[bookPath]!.data);
    const copied=pastedPackage.opaqueObjects!.find(o=>o.signature!==destination.opaqueObjects![0]!.signature)!;
    expect(pastedPackage.parts[copied.partPaths.find(path=>path.endsWith(".xlsx"))!]!.data).toBe(source.parts[bookPath]!.data);
    const transaction=applyEditorHistoryTransaction(createEmptyEditorHistoryState(),state,prepared);
    const undo=takeEditorUndoStep(transaction,prepared)!;
    expect(undo.nextState).toBe(state);
    const undonePackage=await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(undo.nextState.document));
    expect(undonePackage.opaqueObjects).toHaveLength(1);
    expect(Object.keys(undonePackage.parts).some(path=>path.startsWith("word/oasis-transfer-"))).toBe(false);
    const redo=takeEditorRedoStep(undo.history,undo.nextState)!;
    expect(redo.nextState).toBe(prepared);
    expect((await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(redo.nextState.document))).opaqueObjects).toHaveLength(2);
    // Capture uses a fresh source inventory and rejects mixed selections.
    const selected={...state,selection:{anchor:paragraphOffsetToPosition(p,19),focus:paragraphOffsetToPosition(p,20)}};
    expect(captureSelectedOpaqueChart(selected).parts.find(part=>part.path===bookPath)?.data).toBe(destination.parts[bookPath]!.data);
    await expect(prepareOpaqueChartPaste(selected,manifest)).rejects.toThrow(/collapsed caret/);
    expect(()=>captureSelectedOpaqueChart(state)).toThrow(/select one/);
    // Native clipboard handles transport only the token. Actual dependencies
    // remain in realm memory. Different editor instances can share it.
    const clipboard=new Map<string,string>();
    const transfer={
      get types(){return [...clipboard.keys()];},
      getData:(type:string)=>clipboard.get(type)??"",
      setData:(type:string,value:string)=>{clipboard.set(type,value);},
    };
    let live=state,readOnly=false,commits=0,issue="";
    const liveProxy=new Proxy({} as typeof state,{
      get:(_,key)=>Reflect.get(live,key),
    });
    const controller=(read:()=>typeof state)=>createEditorClipboardController({
      state:()=>liveProxy,stateSnapshot:read,isReadOnly:()=>readOnly,
      forcePlainTextPaste:()=>false,setForcePlainTextPaste:()=>{},
      clearPreferredColumn:()=>{},resetTransactionGrouping:()=>{},
      focusInput:()=>{},applyTableAwareParagraphEdit:(s,f)=>f(s),
      applyTransactionalState:f=>{const n=f(live);if(n!==live){live=n;commits++;}},
      insertImageFromFile:async()=>{},resolvePositionAtSurfacePoint:()=>null,
      onNativeClipboardIssue:(_,value)=>{issue=value;},
    });
    const copy=controller(()=>selected),paste=controller(()=>live);
    const event={clipboardData:transfer,currentTarget:{value:""},preventDefault:()=>{}} as never;
    copy.handleCopy(event);
    expect(transfer.types).toEqual([OPAQUE_CHART_CLIPBOARD_TYPE]);
    const token=transfer.getData(OPAQUE_CHART_CLIPBOARD_TYPE);
    expect(token).toMatch(/^[0-9a-f-]{36}$/i);
    expect(token).not.toContain("chartSpace");
    await paste.handlePaste(event);
    expect(commits).toBe(1);
    expect(getParagraphs(live)[0]!.runs.map(r=>r.text).join("")).toBe("Changed\uFFFC destination\uFFFC");
    live=state;
    const pending=paste.handlePaste(event);
    // The facade stays identical, but its committed snapshot changes.
    live={...state,selection:{anchor:paragraphOffsetToPosition(p,1),focus:paragraphOffsetToPosition(p,1)}};
    const intervening=live;
    await pending;
    expect(live).toBe(intervening);
    expect(commits).toBe(1);
    expect(issue).toBe("document-changed");
    live=state;
    const denied=paste.handlePaste(event);
    readOnly=true;
    await denied;
    expect(live).toBe(state);
    expect(commits).toBe(1);
    readOnly=false;
    transfer.setData(OPAQUE_CHART_CLIPBOARD_TYPE,JSON.stringify(manifest));
    await paste.handlePaste(event);
    expect(issue).toBe("unsupported");
    expect(commits).toBe(1);
    live=selected;
    copy.handleCut(event);
    expect(issue).toBe("unsupported");
    expect(live).toBe(selected);
    expect(commits).toBe(1);

    const second=await applyOpaqueTransferToDocx(first.buffer,manifest,0);
    expect(second.plan.drawingId).not.toBe(first.plan.drawingId);
    expect(second.plan.addedParts[0]!.path).not.toBe(first.plan.addedParts[0]!.path);
    expect((await captureDocxSourcePackage(second.buffer)).opaqueObjects).toHaveLength(3);
    const imported=await importDocxInWorker(second.buffer);
    const paragraph=imported.sections?.[0]?.blocks[0];
    if(paragraph?.type!=="paragraph")throw Error("Expected body paragraph");
    expect(paragraph.runs.filter(r=>r.kind==="opaque")).toHaveLength(3);
    expect(paragraph.runs.map(r=>r.text).join("")).toBe("Destination\uFFFC\uFFFC\uFFFC");
    paragraph.runs.find(r=>r.text==="Destination")!.text="Edited destination";
    const roundtrip=await exportEditorDocumentToDocxPreservingSource(imported);
    expect(auditOpaqueObjectPreservation(imported.sourcePackage!,await captureDocxSourcePackage(roundtrip))).toEqual([]);
    // A destination with no previous opaque objects or owner .rels.
    const empty=await applyOpaqueTransferToDocx(await make("Blank","",false),manifest,0);
    expect((await captureDocxSourcePackage(empty.buffer)).opaqueObjects).toHaveLength(1);
    await expect(applyOpaqueTransferToDocx(destinationBytes,manifest,99)).rejects.toThrow(/paragraph index/);
    const hostile=structuredClone(manifest);hostile.parts.pop();
    await expect(applyOpaqueTransferToDocx(destinationBytes,hostile,0)).rejects.toThrow();
    const signed=await JSZip.loadAsync(destinationBytes);
    signed.file("_xmlsignatures/sig1.xml","<signature/>");
    await expect(applyOpaqueTransferToDocx(await signed.generateAsync({type:"arraybuffer"}),manifest,0)).rejects.toThrow(/signed package/);
    const duplicate=await JSZip.loadAsync(destinationBytes);
    const types=await duplicate.file("[Content_Types].xml")!.async("string");
    duplicate.file("[Content_Types].xml",types.replace("</Types>",'<Default Extension="XML" ContentType="application/xml"/></Types>'));
    await expect(applyOpaqueTransferToDocx(await duplicate.generateAsync({type:"arraybuffer"}),manifest,0)).rejects.toThrow(/content type default/);
  },30000);

  it("remaps chart parts and relationships into a collision-free destination plan without mutating either snapshot",()=>{
    const s=source();
    const chart=s.parts["word/charts/chart1.xml"]!,book=s.parts["word/embeddings/book.xlsx"]!;
    chart.contentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml";
    chart.data='<c:chartSpace xmlns:c="'+C+'" xmlns:rel="'+R+'"><c:externalData rel:id="rIdData"/></c:chartSpace>';
    chart.relationships=chart.relationships!.filter(r=>r.id==="rIdData");
    book.contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    book.relationships=[];
    const manifest=captureOpaqueTransferManifest(s,inspectDocxOpaqueObjects(s).objects[0]!);
    const dest=structuredClone(s);
    dest.parts["word/embeddings/book.xlsx"]!.data="BAUG";
    dest.parts["word/document.xml"]!.data=root(drawing.replace('id="1"','id="1879048192"')+'<wx:t>rIdOasisTransfer2</wx:t>');
    dest.parts["word/document.xml"]!.relationships!.push({id:"rIdOasisTransfer1",type:R+"/chart",target:"charts/chart1.xml",resolvedTarget:"word/charts/chart1.xml"});
    // Reserve all descendants, including differently cased parts and
    // orphaned type overrides, not only the exact candidate filename.
    dest.parts["WORD/OASIS-TRANSFER-1/existing.xml"]=part("WORD/OASIS-TRANSFER-1/existing.xml","<existing/>");
    dest.contentTypes.overrides["word/oasis-transfer-2/reserved.xml"]="application/xml";
    // Real captured DOCX snapshots include package control and relationship parts.
    dest.parts["[Content_Types].xml"]=part("[Content_Types].xml",`<Types xmlns="${CT}"/>`);
    dest.parts["_rels/.rels"]=part("_rels/.rels",`<Relationships xmlns="${P}"/>`);
    dest.parts["word/_rels/document.xml.rels"]=part("word/_rels/document.xml.rels",`<Relationships xmlns="${P}"/>`);
    const before=structuredClone(dest),transport=structuredClone(manifest);
    const plan=planOpaqueTransferInsertion(manifest,dest);
    expect(planOpaqueTransferInsertion(manifest,dest)).toEqual(plan);
    expect(dest).toEqual(before);
    expect(manifest).toEqual(transport);
    expect(plan.destinationOwner).toBe("word/document.xml");
    expect(plan.pathMapping.map(p=>p.to)).toEqual(["word/oasis-transfer-3/part-1.xml","word/oasis-transfer-3/part-2.xlsx"]);
    expect(plan.relationshipMapping).toEqual([{from:"rIdChart",to:"rIdOasisTransfer3"}]);
    expect(plan.drawingId).toBe(1879048193);
    expect(plan.destinationRun.fragmentXml).toContain('rel:id="rIdOasisTransfer3"');
    expect(plan.destinationRun.fragmentXml).toContain('id="1879048193"');
    expect(plan.addedRelationships).toEqual([{id:"rIdOasisTransfer3",type:R+"/chart",target:"oasis-transfer-3/part-1.xml",resolvedTarget:"word/oasis-transfer-3/part-1.xml",targetMode:"Internal"}]);
    expect(plan.addedParts[0]!.relationships).toEqual([{id:"rIdData",type:R+"/package",target:"part-2.xlsx",resolvedTarget:"word/oasis-transfer-3/part-2.xlsx",targetMode:"Internal"}]);
    expect(plan.addedParts[0]!.data).toBe(chart.data);
    expect(plan.addedParts[1]!.data).toBe(book.data);
    expect(plan.contentTypeOverrides).toEqual({
      "word/oasis-transfer-3/part-1.xml":chart.contentType,
      "word/oasis-transfer-3/part-2.xlsx":book.contentType,
    });
    const simulated=structuredClone(dest);
    for(const p of plan.addedParts)simulated.parts[p.path]={...p,originalHash:"fixture"};
    simulated.parts[plan.destinationOwner]!.relationships!.push(...plan.addedRelationships);
    simulated.parts[plan.destinationOwner]!.data=simulated.parts[plan.destinationOwner]!.data.replace("</wx:r></wx:p>",plan.destinationRun.fragmentXml+"</wx:r></wx:p>");
    const found=inspectDocxOpaqueObjects(simulated);
    expect(found.diagnostics.filter(d=>d.level==="error")).toEqual([]);
    expect(found.objects).toHaveLength(2);
    const copied=found.objects.find(o=>o.signature===plan.destinationRun.signature)!;
    expect(copied.partPaths).toEqual(plan.addedParts.map(p=>p.path));
    expect(simulated.parts["word/embeddings/book.xlsx"]!.data).toBe("BAUG");
    expect(simulated.parts[copied.partPaths[1]!]!.data).toBe("AQID");
    // Invoking the pure plan against a snapshot that already contains the
    // first insertion reserves a different namespace, relationship and ID.
    const another=planOpaqueTransferInsertion(manifest,simulated);
    expect(another.pathMapping[0]!.to).toContain("oasis-transfer-4/");
    expect(another.drawingId).not.toBe(plan.drawingId);
    expect(another.addedRelationships[0]!.id).not.toBe(plan.addedRelationships[0]!.id);
    const malformed=structuredClone(dest);
    malformed.parts["word/document.xml"]!.relationships!.push({...malformed.parts["word/document.xml"]!.relationships![0]!});
    expect(()=>planOpaqueTransferInsertion(manifest,malformed)).toThrow(/Opaque insertion rejected/);
    const bad=structuredClone(dest);
    bad.contentTypes.overrides["word/%6fasis-transfer-3/alias.xml"]="application/xml";
    expect(()=>planOpaqueTransferInsertion(manifest,bad)).toThrow(/ambiguous destination OPC path/);
  });

  it("captures a detached, bounded chart closure without unrelated document parts",()=>{
    const s=source();
    const chart=s.parts["word/charts/chart1.xml"]!,book=s.parts["word/embeddings/book.xlsx"]!;
    chart.contentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml";
    chart.relationships=chart.relationships!.filter(r=>r.id==="rIdData");
    book.contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    book.relationships=[];
    s.parts["word/unrelated.xml"]=part("word/unrelated.xml","<private>not copied</private>");
    const original=inspectDocxOpaqueObjects(s).objects[0]!;
    const before=structuredClone(s);
    const manifest=captureOpaqueTransferManifest(s,original);
    expect(manifest.parts.map(p=>p.path)).toEqual(["word/charts/chart1.xml","word/embeddings/book.xlsx"]);
    expect(manifest.parts[1]!.data).toBe("AQID");
    expect(JSON.stringify(manifest)).not.toContain("not copied");
    expect(validateOpaqueTransferManifest(JSON.parse(JSON.stringify(manifest)))).toEqual(manifest);
    expect(s).toEqual(before);
    manifest.parts[1]!.data="BAUG";
    expect(book.data).toBe("AQID");
    const clean=captureOpaqueTransferManifest(s,original);
    const invalid=(change:(m:typeof clean)=>void)=>{
      const m=structuredClone(clean);change(m);
      expect(()=>validateOpaqueTransferManifest(m)).toThrow(/Opaque transfer rejected/);
    };
    invalid(m=>{m.parts.pop();});
    invalid(m=>{m.parts.push({...m.parts[1]!,path:"word/embeddings/extra.xlsx"});});
    invalid(m=>{m.parts.push({...m.parts[1]!});});
    invalid(m=>{m.parts[1]!.path="../outside.xlsx";});
    invalid(m=>{m.parts[1]!.contentType="application/vnd.ms-excel.sheet.macroEnabled.12";});
    invalid(m=>{m.parts[0]!.data='<!DOCTYPE c:chartSpace [<!ENTITY x "bad">]>'+m.parts[0]!.data;});
    invalid(m=>{m.parts[0]!.relationships[0]!.targetMode="External";});
    invalid(m=>{m.parts[0]!.relationships[0]!.target="../embeddings/another.xlsx";});
    invalid(m=>{m.parts[1]!.data="not base64!";});
    invalid(m=>{m.fragmentXml+="<w:r/>";});
    invalid(m=>{m.signature="forged";});
    invalid(m=>{m.relationships.push({...m.relationships[0]!});});
    invalid(m=>{m.parts[1]!.relationships=[{...m.relationships[0]!,target:"../charts/chart1.xml"}];});
    expect(()=>captureOpaqueTransferManifest(s,{...original,ordinal:99})).toThrow(/ambiguous/);
    const external=source();
    expect(()=>captureOpaqueTransferManifest(external,inspectDocxOpaqueObjects(external).objects[0]!)).toThrow(/Opaque transfer rejected/);
  });

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
  it("authorizes only explicit unique originals; preserves shared target closure and refuses stale or duplicate identities",()=>{
    const s=source();
    // Distinct object identity, shared chart and workbook relationships.
    const second=drawing.replace('id="1" name="Chart"','id="2" name="Chart 2"');
    s.parts["word/document.xml"]!.data=root(drawing+second);
    const objects=inspectDocxOpaqueObjects(s).objects;
    expect(objects).toHaveLength(2);
    const first=objects[0]!;
    const intent={ownerPath:first.ownerPath,ordinal:first.ordinal,signature:first.signature};
    const out=structuredClone(s);
    out.parts["word/document.xml"]!.data=root(second);
    expect(auditOpaqueObjectPreservation(s,out,[intent])).toEqual([]);
    expect(auditOpaqueObjectPreservation(s,out)).not.toEqual([]);
    expect(auditOpaqueObjectPreservation(s,s,[intent]).map(d=>d.code)).toContain("opaque-object-introduced");
    out.parts["word/embeddings/book.xlsx"]!.data="BAUG";
    expect(auditOpaqueObjectPreservation(s,out,[intent]).map(d=>d.code)).toContain("opaque-target-content-changed");
    expect(auditOpaqueObjectPreservation(s,out,[{...intent,ordinal:99}]).map(d=>d.code)).toContain("opaque-deletion-intent-invalid");
    const duplicate=source();
    duplicate.parts["word/document.xml"]!.data=root(drawing+drawing);
    expect(auditOpaqueObjectPreservation(duplicate,source(),[intent]).map(d=>d.code)).toContain("opaque-deletion-intent-invalid");
  });
  it("plans a deletion-local cut and protects shared, unrelated and ambiguous parts",()=>{
    const s=source(),main=s.mainDocumentPart,chart="word/charts/chart1.xml",book="word/embeddings/book.xlsx";
    const relPath="word/_rels/document.xml.rels";
    const relXml=(items:Array<[string,string,string]>)=>'<Relationships xmlns="'+P+'">'+items.map(([id,type,target])=>'<Relationship Id="'+id+'" Type="'+type+'" Target="'+target+'"/>').join("")+'</Relationships>';
    s.parts[chart]!.contentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml";
    s.parts[book]!.contentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    s.parts[relPath]=part(relPath,relXml([["rIdChart",R+"/chart","charts/chart1.xml"]]));
    const cr="word/charts/_rels/chart1.xml.rels",br="word/embeddings/_rels/book.xlsx.rels";
    s.parts[cr]=part(cr,relXml([["rIdData",R+"/package","../embeddings/book.xlsx"]]));
    s.parts[br]=part(br,relXml([["rIdCycle","urn:cycle","../charts/chart1.xml"]]));
    const original=inspectDocxOpaqueObjects(s).objects[0]!;
    const intent={ownerPath:original.ownerPath,ordinal:original.ordinal,signature:original.signature};
    const out=structuredClone(s);
    out.parts[main]!.data=root("");
    out.parts["word/embeddings/unrelated.xlsx"]=part("word/embeddings/unrelated.xlsx","unrelated");
    const plan=planOpaqueDependencyPruning(s,out,[intent]);
    expect(plan.removeEdges.map(e=>e.id)).toEqual(["rIdChart"]);
    expect(plan.removeParts).toEqual([chart,book]);
    const shared=structuredClone(out);
    shared.parts["word/unrelated.xml"]=part("word/unrelated.xml","<unknown/>");
    shared.parts["word/_rels/unrelated.xml.rels"]=part("word/_rels/unrelated.xml.rels",relXml([["rIdShared","urn:unknown","embeddings/book.xlsx"]]));
    expect(planOpaqueDependencyPruning(s,shared,[intent]).removeParts).toEqual([]);
    const sameId=structuredClone(out);
    sameId.parts[main]!.data=root('<future:node xmlns:future="urn:future" future:ref="rId&#67;hart"/>');
    expect(planOpaqueDependencyPruning(s,sameId,[intent]).removeEdges).toEqual([]);
    const ambiguous=structuredClone(out);
    ambiguous.parts[relPath]!.data=relXml([["rIdChart",R+"/chart","charts/chart1.xml"],["rIdEscaped","urn:unknown","embeddings/book%2Exlsx"]]);
    expect(planOpaqueDependencyPruning(s,ambiguous,[intent]).skippedReason).toBeDefined();
    expect(planOpaqueDependencyPruning(s,ambiguous,[intent]).removeParts).toEqual([]);
  });
  it("plans a namespace-aware story relationship remap without mutating original parts",()=>{
    const s=source(),path="word/stories/header42.xml";
    s.parts[path]=part(path,'<wx:hdr xmlns:wx="'+W+'" xmlns:rel="'+R+'"><wx:p><wx:r><wx:t>Header</wx:t><wx:t>rIdOasisOpaque2</wx:t></wx:r></wx:p></wx:hdr>',{
      contentType:"application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
      relationships:[{id:"rIdChart",type:R+"/image",target:"../media/p.png",resolvedTarget:"word/media/p.png"},{id:"rIdOasisOpaque1",type:R+"/image",target:"../media/p.png",resolvedTarget:"word/media/p.png"}]
    });
    s.parts["word/media/p.png"]=part("word/media/p.png","AQID",{kind:"binary",encoding:"base64"});
    s.parts[s.mainDocumentPart]!.relationships!.push({id:"rIdHeader",type:R+"/header",target:"stories/header42.xml",resolvedTarget:path});
    const object=inspectDocxOpaqueObjects(s).objects[0]!,before=structuredClone(s);
    const plan=planOpaqueStoryRelocation(s,object,path);
    expect(plan.idMapping).toEqual([{from:"rIdChart",to:"rIdOasisOpaque3"}]);
    expect(plan.destinationRun.fragmentXml).toContain('rel:id="rIdOasisOpaque3"');
    expect(plan.addedRelationships).toEqual([{id:"rIdOasisOpaque3",type:R+"/chart",target:"../charts/chart1.xml",resolvedTarget:"word/charts/chart1.xml",targetMode:"Internal"}]);
    expect(plan.sharedPartPaths).toEqual(object.partPaths);
    expect(s).toEqual(before);
    expect(()=>planOpaqueStoryRelocation(s,object,s.mainDocumentPart)).toThrow(/Same-story/);
    expect(()=>planOpaqueStoryRelocation(s,{...object,ordinal:99},path)).toThrow(/Ambiguous/);
    const ambiguous=structuredClone(s);
    ambiguous.parts[path]!.relationships!.push({...ambiguous.parts[path]!.relationships![0]!});
    expect(()=>planOpaqueStoryRelocation(ambiguous,object,path)).toThrow(/Duplicate destination/);
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
  it("does not promote a supported WPS text box with its equivalent legacy VML fallback to opaque",()=>{
    const s=source();
    const mc="http://schemas.openxmlformats.org/markup-compatibility/2006";
    const wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape";
    const box='<wx:txbxContent><wx:p><wx:r><wx:t>Native box</wx:t></wx:r></wx:p></wx:txbxContent>';
    const choice=`<mc:Choice Requires="shape"><wx:drawing><wp:inline><a:graphic><a:graphicData uri="${wps}"><shape:wsp><shape:txbx>${box}</shape:txbx></shape:wsp></a:graphicData></a:graphic></wp:inline></wx:drawing></mc:Choice>`;
    const fallback=`<mc:Fallback><wx:pict><v:shape xmlns:v="urn:schemas-microsoft-com:vml"><v:textbox>${box}</v:textbox></v:shape></wx:pict></mc:Fallback>`;
    const wrap=(content:string)=>`<mc:AlternateContent xmlns:mc="${mc}" xmlns:shape="${wps}">${content}</mc:AlternateContent>`;
    s.parts["word/document.xml"]!.data=root(wrap(choice+fallback));
    expect(inspectDocxOpaqueObjects(s).objects).toEqual([]);
    // A genuinely unsupported Choice must still trigger the audit.
    s.parts["word/document.xml"]!.data=root(wrap(choice+'<mc:Choice Requires="shape">'+drawing+'</mc:Choice>'+fallback));
    expect(inspectDocxOpaqueObjects(s).objects.map(o=>o.kind)).toContain("chart");
    // An OLE object in a fallback is not interchangeable with the text box.
    s.parts["word/document.xml"]!.data=root(wrap(choice+fallback.replace("</wx:pict>",'<o:OLEObject xmlns:o="urn:schemas-microsoft-com:office:office" rel:id="rIdChart"/></wx:pict>')));
    expect(inspectDocxOpaqueObjects(s).objects.map(o=>o.kind)).toContain("embedded");
  });
  it("moves an inline chart from body to an existing header, remaps its relationship, and preserves history",async()=>{
    const zip=new JSZip();
    const headerPath="word/stories/header42.xml",chartPath="word/charts/chart1.xml";
    const rel=(id:string,type:string,target:string)=>'<Relationship Id="'+id+'" Type="'+R+'/'+type+'" Target="'+target+'"/>';
    const relationships=(items:string)=>'<Relationships xmlns="'+P+'">'+items+'</Relationships>';
    const types='<Types xmlns="'+CT+'"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/'+headerPath+'" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/'+chartPath+'" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>';
    zip.file("[Content_Types].xml",types);
    zip.file("_rels/.rels",relationships(rel("rIdOffice","officeDocument","word/document.xml")));
    zip.file("word/document.xml",root(drawing).replace("<wx:sectPr/>",'<wx:sectPr><wx:headerReference wx:type="default" rel:id="rIdHeader"/></wx:sectPr>'));
    zip.file("word/_rels/document.xml.rels",relationships(rel("rIdChart","chart","charts/chart1.xml")+rel("rIdHeader","header","stories/header42.xml")));
    zip.file(headerPath,'<wx:hdr xmlns:wx="'+W+'" xmlns:rel="'+R+'"><wx:p><wx:r><wx:t>Header text</wx:t></wx:r></wx:p></wx:hdr>');
    zip.file("word/stories/_rels/header42.xml.rels",relationships(rel("rIdChart","image","../media/original.png")));
    zip.file("word/media/original.png",new Uint8Array([1,2,3]));
    zip.file(chartPath,'<c:chartSpace xmlns:c="'+C+'"/>');
    const doc=await importDocxInWorker(await zip.generateAsync({type:"arraybuffer"}));
    const body=doc.sections?.[0]?.blocks[0],header=doc.sections?.[0]?.header?.[0];
    if(body?.type!=="paragraph"||header?.type!=="paragraph")throw Error("Expected existing body and header");
    const offset=body.runs.slice(0,body.runs.findIndex(r=>r.kind==="opaque")).reduce((n,r)=>n+r.text.length,0);
    const initial=createEditorStateFromDocument(doc);
    expect(initial.activeZone).toBe("main");
    const selected={...initial,selection:{anchor:paragraphOffsetToPosition(body,offset),focus:paragraphOffsetToPosition(body,offset+1)}};
    const target=paragraphOffsetToPosition(header,0);
    const hit={zone:"header" as const,paragraphId:header.id,paragraphOffset:0};
    // Controller dispatch must not flatten the destination into the source
    // editing zone. Copy remains unsupported until asset transfer exists.
    expect(applyTextDragDrop(selected,target,hit,true,(s,change)=>change(s))).toBe(selected);
    const moved=applyTextDragDrop(selected,target,hit,false,(s,change)=>change(s));
    const direct=relocateSelectedOpaqueObject(selected,{zone:"header",paragraphId:header.id,offset:0});
    expect(moved.document.opaqueRelocationIntent).toEqual(direct.document.opaqueRelocationIntent);
    expect(moved.activeZone).toBe("header");
    expect(moved.document.opaqueRelocationIntent?.destinationOwner).toBe(headerPath);
    expect(doc.opaqueRelocationIntent).toBeUndefined();
    expect(moved.document.sourcePackage).toBe(doc.sourcePackage);
    const result=await exportEditorDocumentToDocxPreservingSource(moved.document);
    const pkg=await captureDocxSourcePackage(result);
    expect(pkg.opaqueObjects).toHaveLength(1);
    const relocated=pkg.opaqueObjects![0]!;
    expect(relocated.ownerPath).toBe(headerPath);
    expect(relocated.relationshipIds).toEqual(["rIdOasisOpaque1"]);
    expect(pkg.parts[headerPath]!.relationships).toEqual(expect.arrayContaining([
      expect.objectContaining({id:"rIdChart",resolvedTarget:"word/media/original.png"}),
      expect.objectContaining({id:"rIdOasisOpaque1",resolvedTarget:chartPath,type:R+"/chart"})
    ]));
    expect(pkg.parts[chartPath]!.data).toBe(doc.sourcePackage!.parts[chartPath]!.data);
    expect(pkg.parts["word/media/original.png"]!.data).toBe(doc.sourcePackage!.parts["word/media/original.png"]!.data);
    const reopened=await importDocxInWorker(result);
    const reopenedBody=reopened.sections?.[0]?.blocks[0],reopenedHeader=reopened.sections?.[0]?.header?.[0];
    expect(reopenedBody?.type==="paragraph"&&reopenedBody.runs.map(r=>r.text).join("")).toBe("Neighbor");
    expect(reopenedHeader?.type==="paragraph"&&reopenedHeader.runs.map(r=>r.text).join("")).toBe("\uFFFCHeader text");
    // A claimed move without the changed model, or changed model without
    // its authorization, must never become a successful export.
    await expect(exportEditorDocumentToDocxPreservingSource({...doc,opaqueRelocationIntent:moved.document.opaqueRelocationIntent})).rejects.toThrow();
    await expect(exportEditorDocumentToDocxPreservingSource({...moved.document,opaqueRelocationIntent:undefined})).rejects.toThrow();
    const history=applyEditorHistoryTransaction(createEmptyEditorHistoryState(),selected,moved);
    const undone=takeEditorUndoStep(history,moved)!;
    const restored=await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(undone.nextState.document));
    expect(restored.opaqueObjects?.[0]?.ownerPath).toBe("word/document.xml");
    const redone=takeEditorRedoStep(undone.history,undone.nextState)!;
    expect((await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(redone.nextState.document))).opaqueObjects?.[0]?.ownerPath).toBe(headerPath);
  },30000);
  it("projects multiple opaque children interleaved with text in one w:r and preserves them through edits",async()=>{
    const zip=new JSZip();
    const chartPath="word/charts/chart1.xml";
    zip.file("[Content_Types].xml",'<Types xmlns="'+CT+'"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/'+chartPath+'" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>');
    zip.file("_rels/.rels",'<Relationships xmlns="'+P+'"><Relationship Id="rIdOffice" Type="'+R+'/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/_rels/document.xml.rels",'<Relationships xmlns="'+P+'"><Relationship Id="rIdChart" Type="'+R+'/chart" Target="charts/chart1.xml"/></Relationships>');
    zip.file(chartPath,'<c:chartSpace xmlns:c="'+C+'"/>');
    const mixed='<wx:rPr><wx:b/></wx:rPr><wx:t xml:space="preserve">Before </wx:t>'+drawing+
      '<wx:tab/><wx:t>Middle</wx:t>'+drawing.replace('id="1" name="Chart"','id="2" name="Chart two"')+
      '<wx:br/><wx:t>After</wx:t>';
    zip.file("word/document.xml",root(mixed));
    let doc=await importDocxInWorker(await zip.generateAsync({type:"arraybuffer"}));
    const original=doc.sourcePackage!;
    expect(original.opaqueObjects).toHaveLength(2);
    const getBody=()=>{
      const p=doc.sections?.[0]?.blocks[0];
      if(p?.type!=="paragraph")throw Error("Expected mixed paragraph");
      return p;
    };
    expect(getBody().runs.map(r=>r.text).join("")).toBe("NeighborBefore \uFFFC\tMiddle\uFFFC\nAfter");
    const opaque=getBody().runs.filter(r=>r.kind==="opaque");
    expect(opaque).toHaveLength(2);
    expect(opaque.every(r=>r.styles?.bold===true)).toBe(true);
    expect(opaque.map(r=>r.opaque.signature)).toEqual(original.opaqueObjects!.map(o=>o.signature));
    const tail=getBody().runs.find(r=>r.text==="\nAfter")!;
    expect(tail.styles?.bold).toBe(true);
    tail.text="\nEdited after";
    for(let cycle=0;cycle<3;cycle++){
      const saved=await exportEditorDocumentToDocxPreservingSource(doc);
      const actual=await captureDocxSourcePackage(saved);
      expect(auditOpaqueObjectPreservation(original,actual)).toEqual([]);
      expect(actual.parts[chartPath]?.data).toBe(original.parts[chartPath]?.data);
      doc=await importDocxInWorker(saved);
      expect(getBody().runs.map(r=>r.text).join("")).toBe("NeighborBefore \uFFFC\tMiddle\uFFFC\nEdited after");
      expect(getBody().runs.filter(r=>r.kind==="opaque")).toHaveLength(2);
    }
  },30000);

  it("preserves ordered native pictures, symbol and bookmark beside an opaque chart",async()=>{
    const zip=new JSZip();
    const chartPath="word/charts/chart1.xml";
    const png="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=";
    const pictureNS="http://schemas.openxmlformats.org/drawingml/2006/picture";
    const picture=(id:number,name:string)=>'<wx:drawing><wp:inline><wp:extent cx="95250" cy="190500"/><wp:docPr id="'+id+'" name="'+name+'" descr="'+name+'"/><a:graphic><a:graphicData uri="'+pictureNS+'"><pic:pic xmlns:pic="'+pictureNS+'"><pic:blipFill><a:blip rel:embed="rIdPicture"/></pic:blipFill><pic:spPr/></pic:pic></a:graphicData></a:graphic></wp:inline></wx:drawing>';
    zip.file("[Content_Types].xml",'<Types xmlns="'+CT+'"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/'+chartPath+'" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/></Types>');
    zip.file("_rels/.rels",'<Relationships xmlns="'+P+'"><Relationship Id="rIdOffice" Type="'+R+'/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/_rels/document.xml.rels",'<Relationships xmlns="'+P+'"><Relationship Id="rIdChart" Type="'+R+'/chart" Target="charts/chart1.xml"/><Relationship Id="rIdPicture" Type="'+R+'/image" Target="media/source.png"/></Relationships>');
    zip.file(chartPath,'<c:chartSpace xmlns:c="'+C+'"/>');
    zip.file("word/media/source.png",png,{base64:true});
    const mixed='<wx:rPr><wx:b/></wx:rPr><wx:t>A</wx:t>'+
      '<wx:bookmarkStart wx:id="42" wx:name="MixedObjects"/>'+picture(12,"First picture")+
      '<wx:t>B</wx:t>'+drawing.replace('id="1" name="Chart"','id="99" name="Chart"')+
      '<wx:sym wx:font="Symbol" wx:char="F0B7"/>'+picture(13,"Second picture")+
      '<wx:bookmarkEnd wx:id="42"/><wx:t>C</wx:t>';
    zip.file("word/document.xml",root(mixed));
    let doc=await importDocxInWorker(await zip.generateAsync({type:"arraybuffer"}));
    const original=doc.sourcePackage!;
    const getBody=()=>{
      const p=doc.sections?.[0]?.blocks[0];
      if(p?.type!=="paragraph")throw Error("Expected mixed paragraph");
      return p;
    };
    const verify=()=>{
      const body=getBody(),objects=body.runs.filter(r=>r.kind==="image"||r.kind==="opaque"||r.kind==="sym");
      expect(objects.map(r=>r.kind)).toEqual(["image","opaque","sym","image"]);
      const images=objects.filter(r=>r.kind==="image");
      expect(images.map(r=>r.image.alt)).toEqual(["First picture","Second picture"]);
      expect(images.every(r=>r.image.width===10&&r.image.height===20)).toBe(true);
      expect(objects.every(r=>r.styles?.bold===true)).toBe(true);
      expect(body.runs.map(r=>r.text).join("")).toBe("NeighborA\uFFFCB\uFFFC\uF0B7\uFFFCC");
      expect(Object.values(doc.bookmarks?.items??{}).map(b=>b.name)).toContain("MixedObjects");
    };
    verify();
    // Force a genuine source-backed mutation, not just the no-op byte path.
    getBody().runs.find(r=>r.text==="B")!.styles={bold:true,italic:true};
    const output=await exportEditorDocumentToDocxPreservingSource(doc);
    const captured=await captureDocxSourcePackage(output);
    expect(auditOpaqueObjectPreservation(original,captured)).toEqual([]);
    const reopenedZip=await JSZip.loadAsync(output);
    const main=await reopenedZip.file(captured.mainDocumentPart)!.async("string");
    expect(main).toContain("MixedObjects");
    for(const rel of captured.parts[captured.mainDocumentPart]?.relationships??[]){
      if(rel.type===R+"/image"&&rel.targetMode!=="External"){
        expect(captured.parts[rel.resolvedTarget!]?.data).toBe(png);
      }
    }
    doc=await importDocxInWorker(output);
    verify();
    expect(getBody().runs.find(r=>r.text==="B")?.styles?.italic).toBe(true);
  },30000);

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
    // An old public escape hatch must not serialize raw source fragments.
    await expect(Reflect.apply(exportEditorDocumentToDocx, undefined, [doc,{allowOpaqueSourceFragments:true}])).rejects.toThrow(/source-backed/);
    // Cached inventory is advisory only, including documents saved by an older editor.
    for(const cache of [undefined, []]){
      const legacy=structuredClone(doc);
      legacy.sourcePackage!.opaqueObjects=cache;
      const saved=await exportEditorDocumentToDocxPreservingSource(legacy);
      expect(auditOpaqueObjectPreservation(doc.sourcePackage!,await captureDocxSourcePackage(saved))).toEqual([]);
      expect(legacy.sourcePackage!.opaqueObjects).toEqual(cache);
      const paragraph=legacy.sections![0]!.blocks[0]!;
      if(paragraph.type!=="paragraph")throw Error("Expected body paragraph");
      paragraph.runs=paragraph.runs.filter(r=>r.kind!=="opaque");
      await expect(exportEditorDocumentToDocxPreservingSource(legacy)).rejects.toBeInstanceOf(OpaqueObjectPreservationError);
    }
    // A retained object signature must not authorize additional arbitrary XML.
    // Reject before any package overlay can resurrect or hide the injection.
    const injected=structuredClone(doc);
    const injectedParagraph=injected.sections![0]!.blocks[0]!;
    if(injectedParagraph.type!=="paragraph")throw Error("Expected paragraph");
    const injectedRun=injectedParagraph.runs.find(r=>r.kind==="opaque");
    if(injectedRun?.kind!=="opaque")throw Error("Expected opaque object");
    injectedRun.opaque.fragmentXml+='</w:r><w:r><w:t>Injected</w:t>';
    await expect(exportEditorDocumentToDocxPreservingSource(injected)).rejects.toThrow(/authorized source fragment/);
    const forged=structuredClone(doc);
    const forgedParagraph=forged.sections![0]!.blocks[0]!;
    if(forgedParagraph.type!=="paragraph")throw Error("Expected paragraph");
    const forgedRun=forgedParagraph.runs.find(r=>r.kind==="opaque");
    if(forgedRun?.kind!=="opaque")throw Error("Expected opaque object");
    forgedRun.opaque.signature="forged-signature";
    await expect(exportEditorDocumentToDocxPreservingSource(forged)).rejects.toThrow(/authorized source fragment/);
    const strict=await exportEditorDocumentToDocxPreservingSource(doc,{requireOpaquePreservation:true});
    expect(auditOpaqueObjectPreservation(doc.sourcePackage!,await captureDocxSourcePackage(strict))).toEqual([]);
    const roundtrip=await importDocxInWorker(strict);
    const paragraph=roundtrip.sections?.[0]?.blocks[0];
    if(paragraph?.type!=="paragraph")throw Error("Expected round-trip paragraph");
    expect(paragraph.runs.some(r=>r.kind==="opaque")).toBe(true);
    expect(paragraph.runs.map(r=>r.text).join("")).toContain("Changed neighbor");
    // Actual keyboard command paths plus real history snapshots.
    const clean=await importDocxInWorker(strict);
    const body=clean.sections?.[0]?.blocks[0];
    if(body?.type!=="paragraph")throw Error("Expected editable paragraph");
    const offset=body.runs.slice(0,body.runs.findIndex(r=>r.kind==="opaque")).reduce((n,r)=>n+r.text.length,0);
    const at=createEditorStateFromDocument(clean,{offset});
    const selected={...at,selection:{anchor:paragraphOffsetToPosition(body,offset),focus:paragraphOffsetToPosition(body,offset+1)}};
    // Move the object before its adjacent text using the real drag command.
    const start=paragraphOffsetToPosition(body,0);
    const moved=moveOrCopySelectionToPosition(selected,start);
    const movedBody=moved.document.sections?.[0]?.blocks[0];
    expect(movedBody?.type==="paragraph"&&movedBody.runs.map(r=>r.text).join("")).toBe("\uFFFCChanged neighbor");
    const movedPackage=await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(moved.document));
    expect(auditOpaqueObjectPreservation(clean.sourcePackage!,movedPackage)).toEqual([]);
    expect(movedPackage.opaqueObjects).toHaveLength(1);
    expect(moveOrCopySelectionToPosition(selected,start,{copy:true})).toBe(selected);
    const movedParagraph=moved.document.sections?.[0]?.blocks[0];
    if(movedParagraph?.type!=="paragraph")throw Error("Expected moved paragraph");
    const back=moveOrCopySelectionToPosition(moved,paragraphOffsetToPosition(movedParagraph,offset+1));
    const backBody=back.document.sections?.[0]?.blocks[0];
    expect(backBody?.type==="paragraph"&&backBody.runs.map(r=>r.text).join("")).toBe("Changed neighbor\uFFFC");
    expect(auditOpaqueObjectPreservation(clean.sourcePackage!,await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(back.document)))).toEqual([]);
    const removed=deleteForward(selected);
    expect(removed.document.opaqueDeletionIntents).toHaveLength(1);
    expect(clean.opaqueDeletionIntents).toBeUndefined();
    const output=await exportEditorDocumentToDocxPreservingSource(removed.document);
    const deletedPackage=await captureDocxSourcePackage(output);
    expect(deletedPackage.opaqueObjects??[]).toHaveLength(0);
    expect(deletedPackage.parts["word/charts/chart1.xml"]).toBeUndefined();
    expect(deletedPackage.contentTypes.overrides["word/charts/chart1.xml"]).toBeUndefined();
    expect(deletedPackage.parts[deletedPackage.mainDocumentPart]?.relationships?.some(r=>r.id==="rIdChart")??false).toBe(false);
    const retained=await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(removed.document,{pruneDeletedOpaqueDependencies:false}));
    expect(retained.parts["word/charts/chart1.xml"]?.data).toBe(clean.sourcePackage!.parts["word/charts/chart1.xml"]!.data);
    const reopened=await importDocxInWorker(output);
    const reopenedBody=reopened.sections?.[0]?.blocks[0];
    expect(reopenedBody?.type==="paragraph"&&reopenedBody.runs.map(r=>r.text).join("")).toBe("Changed neighbor");
    const history=applyEditorHistoryTransaction(createEmptyEditorHistoryState(),selected,removed);
    const undone=takeEditorUndoStep(history,removed)!;
    expect(undone.nextState.document.opaqueDeletionIntents).toBeUndefined();
    const undoPackage=await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(undone.nextState.document));
    expect(undoPackage.opaqueObjects).toHaveLength(1);
    expect(undoPackage.parts["word/charts/chart1.xml"]).toBeDefined();
    const redone=takeEditorRedoStep(undone.history,undone.nextState)!;
    expect(redone.nextState.document.opaqueDeletionIntents).toHaveLength(1);
    expect((await captureDocxSourcePackage(await exportEditorDocumentToDocxPreservingSource(redone.nextState.document))).opaqueObjects??[]).toHaveLength(0);
    const backward=deleteBackward(createEditorStateFromDocument(clean,{offset:offset+1}));
    expect(backward.document.opaqueDeletionIntents).toHaveLength(1);
    expect(deleteForward({...selected,trackChangesEnabled:true}).document).toBe(selected.document);
    // A deletion intent without actually removing markup must not pass.
    await expect(exportEditorDocumentToDocxPreservingSource({...clean,opaqueDeletionIntents:removed.document.opaqueDeletionIntents})).rejects.toBeInstanceOf(OpaqueObjectPreservationError);
    p.runs=p.runs.filter(r=>r.kind!=="opaque");
    await expect(exportEditorDocumentToDocxPreservingSource(doc)).rejects.toBeInstanceOf(OpaqueObjectPreservationError);
  },30000);
});
