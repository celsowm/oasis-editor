#!/usr/bin/env node
/** Browser-level chart qualification. Deterministic transport is a required
 * application gate; trusted keyboard/system Clipboard API probes report
 * capability separately and never silently count unavailable formats as pass. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import JSZip from "jszip";
import { createSuite, openGroup, selectRangeInParagraph, placeCaretInParagraph, paragraphsText } from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const {base,engine,output,sha,browser,records}=await createSuite("opaque-chart-clipboard");
const MIME="application/x-oasis-chart-token",WEB="web "+MIME;
const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const P="http://schemas.openxmlformats.org/package/2006/relationships";
const CT="http://schemas.openxmlformats.org/package/2006/content-types";
const C="http://schemas.openxmlformats.org/drawingml/2006/chart";
const WP="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing";
const A="http://schemas.openxmlformats.org/drawingml/2006/main";
const types=body=>'<Types xmlns="'+CT+'"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'+body+'</Types>';
const override=(path,type)=>'<Override PartName="/'+path+'" ContentType="application/vnd.openxmlformats-officedocument.'+type+'"/>';
const rel=(id,type,target)=>'<Relationship Id="'+id+'" Type="'+R+'/'+type+'" Target="'+target+'"/>';
const rels=body=>'<Relationships xmlns="'+P+'">'+body+'</Relationships>';
const workbook=new JSZip();
workbook.file("[Content_Types].xml",types(override("xl/workbook.xml","spreadsheetml.sheet.main+xml")+override("xl/worksheets/sheet1.xml","spreadsheetml.worksheet+xml")));
workbook.file("_rels/.rels",rels(rel("rIdOffice","officeDocument","xl/workbook.xml")));
workbook.file("xl/workbook.xml",'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'+R+'"><sheets><sheet name="Data" sheetId="1" r:id="rIdSheet"/></sheets></workbook>');
workbook.file("xl/_rels/workbook.xml.rels",rels(rel("rIdSheet","worksheet","worksheets/sheet1.xml")));
workbook.file("xl/worksheets/sheet1.xml",'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1"><v>42</v></c></row></sheetData></worksheet>');
const book=await workbook.generateAsync({type:"nodebuffer"});
const fixture=new JSZip();
fixture.file("[Content_Types].xml",types(override("word/document.xml","wordprocessingml.document.main+xml")+override("word/charts/chart1.xml","drawingml.chart+xml")+override("word/embeddings/book.xlsx","spreadsheetml.sheet")));
fixture.file("_rels/.rels",rels(rel("rIdOffice","officeDocument","word/document.xml")));
fixture.file("word/document.xml",'<w:document xmlns:w="'+W+'" xmlns:r="'+R+'" xmlns:wp="'+WP+'" xmlns:a="'+A+'" xmlns:c="'+C+'"><w:body><w:p><w:r><w:t>Before after</w:t></w:r><w:r><w:drawing><wp:inline><wp:extent cx="1905000" cy="952500"/><wp:docPr id="1" name="Chart"/><a:graphic><a:graphicData uri="'+C+'"><c:chart r:id="rIdChart"/></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p><w:sectPr/></w:body></w:document>');
fixture.file("word/_rels/document.xml.rels",rels(rel("rIdChart","chart","charts/chart1.xml")));
fixture.file("word/charts/chart1.xml",'<c:chartSpace xmlns:c="'+C+'" xmlns:r="'+R+'"><c:externalData r:id="rIdData"/></c:chartSpace>');
fixture.file("word/charts/_rels/chart1.xml.rels",rels(rel("rIdData","package","../embeddings/book.xlsx")));
fixture.file("word/embeddings/book.xlsx",book);
const bytes=Array.from(await fixture.generateAsync({type:"uint8array"}));
const original="Before after\uFFFC",pasted="Before\uFFFC after\uFFFC";
const input=page=>page.getByTestId("editor-input");
async function seed(page){
  await page.evaluate(async data=>{
    const c=window.ribbonReference.client;
    await c.import.docx(new File([new Uint8Array(data)],"chart.docx",{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"}));
    c.history.clear();c.document.markClean();
  },bytes);
  assert.equal(await paragraphsText(page),original);
}
async function waitText(page,text){
  await page.waitForFunction(expected=>{
    const c=window.ribbonReference.client;
    return c.document.get().sections[0].blocks[0].runs.map(r=>r.text).join("")===expected;
  },text,{timeout:30000});
}
async function proveExport(page,count){
  const data=await page.evaluate(async()=>{
    const result=await window.ribbonReference.client.io.export({format:"docx"});
    if(!result.ok)throw Error(JSON.stringify(result.error));
    return Array.from(new Uint8Array(await result.value.blob.arrayBuffer()));
  });
  const zip=await JSZip.loadAsync(Uint8Array.from(data));
  const main=await zip.file("word/document.xml").async("string");
  assert.equal((main.match(/<(?:[\w.-]+:)?docPr(?=\s)/g)??[]).length,count);
  const paths=Object.keys(zip.files).filter(p=>p.endsWith(".xlsx"));
  assert.equal(paths.length,count);
  for(const p of paths)assert.deepEqual(await zip.file(p).async("nodebuffer"),book);
  const types=await zip.file("[Content_Types].xml").async("string");
  for(const p of paths)assert.ok(types.includes("/"+p));
  return data;
}
async function verifyHistory(page,label,started){
  await waitText(page,pasted);
  const elapsedMs=performance.now()-started;
  const saved=await proveExport(page,2);
  assert.equal(await page.evaluate(()=>window.ribbonReference.client.history.canUndo()),true);
  await page.evaluate(()=>window.ribbonReference.client.history.undo());
  await waitText(page,original);
  await proveExport(page,1);
  assert.equal(await page.evaluate(()=>window.ribbonReference.client.history.canUndo()),false);
  await page.evaluate(()=>window.ribbonReference.client.history.redo());
  await waitText(page,pasted);
  await proveExport(page,2);
  await writeFile(resolve(output,label+".docx"),Uint8Array.from(saved));
  records.push({sha,engine,scenario:label,status:"passed",elapsedMs:Math.round(elapsedMs),checks:["position","XLSX bytes","content types","undo","redo"]});
}
async function selectChart(page){
  await selectRangeInParagraph(page,0,12,13);
  await input(page).focus();
}
async function caret(page){
  await placeCaretInParagraph(page,0,6);
  await input(page).focus();
}
async function button(page,id){
  return (await openGroup(page,"clipboard","editor-toolbar-"+id)).click();
}
async function synthetic(page,kind,token){
  return input(page).evaluate((el,{kind,token,mime})=>{
    const data=new DataTransfer();
    if(kind==="paste")data.setData(mime,token);
    const event=new Event(kind,{bubbles:true,cancelable:true});
    Object.defineProperty(event,"clipboardData",{value:data});
    el.dispatchEvent(event);
    return {handled:event.defaultPrevented,token:data.getData(mime),types:[...data.types]};
  },{kind,token,mime:MIME});
}
async function inspectEvents(page){
  return page.evaluate(()=>window.chartClipboardEvents);
}
async function boot(adapter){
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  if(!adapter&&engine==="chromium")await context.grantPermissions(["clipboard-read","clipboard-write"]);
  await context.addInitScript(({adapter,mime,web})=>{
    window.chartClipboardEvents=[];
    for(const kind of ["copy","paste","cut"])document.addEventListener(kind,event=>{
      // Capture after application handlers, while the native data is live.
      window.chartClipboardEvents.push({kind, trusted:event.isTrusted,types:[...(event.clipboardData?.types??[])],handled:event.defaultPrevented});
    });
    if(adapter){
      window.chartClipboardItems=[];
      window.chartClipboardDeny=false;
      Object.defineProperty(globalThis,"ClipboardItem",{configurable:true,value:class {
        constructor(data){this.data=data;this.types=Object.keys(data);}
        async getType(type){return this.data[type];}
      }});
      Object.defineProperty(navigator,"clipboard",{configurable:true,value:{
        write:async items=>{
          if(window.chartClipboardDeny)throw new DOMException("denied","NotAllowedError");
          window.chartClipboardItems=items;
        },
        read:async()=>window.chartClipboardItems,
      }});
    }
  },{adapter,mime:MIME,web:WEB});
  const page=await context.newPage(),errors=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.goto(base+"/tests/browser/ribbon/?theme=light&locale=en");
  await waitForRibbonReference(page);
  return {context,page,errors};
}
try{
  // Required in every engine: browser DOM events and actual Ribbon commands,
  // deterministic clipboard adapter. Not a claim about the OS clipboard.
  const mock=await boot(true);
  try{
    const {page}=mock;
    await seed(page);await selectChart(page);
    const copied=await synthetic(page,"copy","");
    assert.equal(copied.handled,true);assert.match(copied.token,/^[a-f0-9-]{36}$/i);
    await caret(page);
    let start=performance.now();
    assert.equal((await synthetic(page,"paste",copied.token)).handled,true);
    await verifyHistory(page,"synthetic-native",start);
    await seed(page);await selectChart(page);
    await button(page,"copy");
    await page.waitForFunction(()=>window.chartClipboardItems.length===1);
    assert.deepEqual(await page.evaluate(()=>window.chartClipboardItems[0].types),[WEB]);
    await caret(page);start=performance.now();await button(page,"paste");
    await verifyHistory(page,"adapter-ribbon",start);
    await seed(page);await selectChart(page);
    const before=await page.evaluate(()=>window.ribbonReference.client.document.version());
    await button(page,"cut");
    await page.getByTestId("editor-clipboard-feedback").waitFor();
    assert.equal(await paragraphsText(page),original);
    assert.equal(await page.evaluate(()=>window.ribbonReference.client.document.version()),before);
    await page.getByTestId("editor-clipboard-feedback-close").click();
    await caret(page);
    await synthetic(page,"paste","forged-token");
    await page.getByTestId("editor-clipboard-feedback").waitFor();
    assert.equal(await paragraphsText(page),original);
    assert.equal(await page.evaluate(()=>window.ribbonReference.client.history.canUndo()),false);
    records.push({sha,engine,scenario:"denied-cut-and-forged-token",status:"passed"});
    assert.deepEqual(mock.errors,[]);
  }finally{await mock.context.close();}
  // Real clipboard: never patch navigator or ClipboardItem in this context.
  // Permissions and custom format support depend on the engine/headless OS.
  const real=await boot(false);
  try{
    const {page}=real;
    await seed(page);await selectChart(page);
    await page.keyboard.press("Control+c");
    await caret(page);
    const start=performance.now();
    await page.keyboard.press("Control+v");
    const events=await inspectEvents(page);
    const received=events.some(e=>e.kind==="paste"&&e.trusted&&e.types.some(t=>t===MIME||t===WEB));
    if(received)await verifyHistory(page,"trusted-keyboard",start);
    else{
      assert.equal(await paragraphsText(page),original,"Unavailable custom format must not insert stray text");
      records.push({sha,engine,scenario:"trusted-keyboard",status:"unqualified",reason:"trusted paste did not deliver custom chart format",events});
    }
    // Chromium explicitly grants read/write in this fresh context. Other
    // engines may require a real OS paste permission prompt.
    if(engine==="chromium"){
      await seed(page);await selectChart(page);
      await button(page,"copy");
      await page.waitForTimeout(250);
      const probe=await page.evaluate(async web=>{
        try{
          const items=await navigator.clipboard.read();
          const item=items.find(i=>i.types.includes(web));
          return {available:!!item,types:items.flatMap(i=>i.types)};
        }catch(e){return {available:false,reason:String(e)};}
      },WEB);
      await caret(page);
      if(probe.available){
        const time=performance.now();await button(page,"paste");
        await verifyHistory(page,"system-ribbon",time);
      }else{
        records.push({sha,engine,scenario:"system-ribbon",status:"unqualified",probe});
        assert.equal(await paragraphsText(page),original);
      }
    }else records.push({sha,engine,scenario:"system-ribbon",status:"unqualified",reason:"headless permission prompt not automated"});
    assert.deepEqual(real.errors,[]);
  }finally{await real.context.close();}
}finally{
  await writeFile(resolve(output,"verification.json"),JSON.stringify(records,null,2)+"\n");
  await browser.close();
}
