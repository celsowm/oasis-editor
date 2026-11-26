#!/usr/bin/env node
/** INDEX browser qualification using actual Ribbon controls and public client. */
import assert from "node:assert/strict";
import {writeFile} from "node:fs/promises";
import {resolve} from "node:path";
import {waitForRibbonReference} from "./ribbon-reference-ready.mjs";
import {createSuite,openGroup,openRibbonPage,placeCaretInParagraph,waitForRibbonSettled,writeVerification} from "./lib/ribbon-suite.mjs";

const {base,engine,output,sha,dirty,records,browser}=await createSuite("index");
async function snapshot(page){
  return page.evaluate(async()=>{
    const {getDocumentParagraphs}=await import("/src/core/model.ts");
    const client=window.ribbonReference.client;
    const paragraphs=getDocumentParagraphs(client.document.get());
    return {texts:paragraphs.map(p=>p.runs.map(r=>r.text).join("")),
      instructions:paragraphs.flatMap(p=>p.runs.filter(r=>r.kind==="fieldInstruction").map(r=>r.fieldInstruction.trim())),
      emphasized:paragraphs.flatMap(p=>p.runs.filter(r=>r.kind==="text"&&r.styles?.bold&&r.styles?.italic).map(r=>r.text)),
      selection:client.getState().selection,undo:client.history.canUndo(),redo:client.history.canRedo()};
  });
}
async function stateEnabled(page,name){
  return page.evaluate(name=>window.ribbonReference.client.commands.state(name).isEnabled,name);
}
async function mark(page,main,sub){
  await (await openGroup(page,"index","editor-toolbar-mark-index-entry")).click();
  const panel=page.getByTestId("editor-index-mark-panel");
  await panel.waitFor({state:"visible"});
  assert.equal(await panel.getByTestId("editor-index-confirm").isDisabled(),true);
  await panel.getByTestId("editor-index-main-entry").fill(main);
  if(sub)await panel.getByTestId("editor-index-subentry").fill(sub);
  if(sub)for(const input of await panel.locator('input[type="checkbox"]').all())await input.check();
  await panel.getByTestId("editor-index-confirm").click();
  await panel.waitFor({state:"hidden"});
}
try{
  for(const {theme,locale,width} of [{theme:"light",locale:"pt-BR",width:1440},{theme:"dark",locale:"en",width:640}]){
    const {page,errors}=await openRibbonPage(browser,base,{theme,locale,width});
    await waitForRibbonReference(page);
    await page.evaluate(async()=>{
      const {createEditorDocument,createEditorParagraph}=await import("/src/core/editorState.ts");
      const c=window.ribbonReference.client;
      c.document.load(createEditorDocument(["Contratos","Água","Fim"].map(createEditorParagraph)));
      c.history.clear();
    });
    await page.getByTestId("editor-ribbon-tab-references").click();
    await placeCaretInParagraph(page,0,9);
    await waitForRibbonSettled(page);
    assert.equal(await stateEnabled(page,"insertIndex"),false);
    assert.equal(await stateEnabled(page,"updateIndex"),false);
    const original=await snapshot(page);
    await mark(page,"Contratos","Licitação");
    const marked=await snapshot(page);
    assert.deepEqual(marked.texts,original.texts);
    assert.deepEqual(marked.selection,original.selection);
    assert.deepEqual(marked.instructions,['XE "Contratos:Licitação" \\b \\i']);
    await page.evaluate(()=>window.ribbonReference.client.history.undo());
    assert.deepEqual((await snapshot(page)).instructions,[]);
    await page.evaluate(()=>window.ribbonReference.client.history.redo());
    assert.deepEqual((await snapshot(page)).instructions,marked.instructions);
    await placeCaretInParagraph(page,2,3);
    await (await openGroup(page,"index","editor-toolbar-insert-index")).click();
    const insert=page.getByTestId("editor-index-insert-panel");
    await insert.waitFor({state:"visible"});
    await insert.getByTestId("editor-index-locale").selectOption("pt-BR");
    await page.screenshot({path:resolve(output,theme+"-"+width+"-insert-panel.png")});
    await insert.getByTestId("editor-index-confirm").click();
    await insert.waitFor({state:"hidden"});
    const inserted=await snapshot(page);
    assert.ok(inserted.texts.includes("Licitação, 1"));
    assert.ok(inserted.emphasized.includes("1"));
    assert.ok(inserted.instructions.includes('INDEX \\z "pt-BR"'));
    await page.evaluate(()=>window.ribbonReference.client.history.undo());
    assert.deepEqual((await snapshot(page)).instructions,marked.instructions);
    await page.evaluate(()=>window.ribbonReference.client.history.redo());
    assert.deepEqual((await snapshot(page)).texts,inserted.texts);
    await placeCaretInParagraph(page,1,4);
    await mark(page,"Água");
    await (await openGroup(page,"index","editor-toolbar-update-index")).click();
    const updated=await snapshot(page);
    assert.ok(updated.texts.includes("Água, 1"));
    assert.ok(updated.texts.indexOf("Água, 1")<updated.texts.lastIndexOf("Contratos"));
    await page.evaluate(()=>window.ribbonReference.client.history.undo());
    assert.ok(!(await snapshot(page)).texts.includes("Água, 1"));
    await page.evaluate(()=>window.ribbonReference.client.history.redo());
    assert.deepEqual((await snapshot(page)).texts,updated.texts);
    await page.evaluate(()=>window.ribbonReference.client.ui.setReadOnly(true));
    for(const name of ["markIndexEntry","insertIndex","updateIndex"])assert.equal(await stateEnabled(page,name),false);
    await page.evaluate(()=>window.ribbonReference.client.ui.setReadOnly(false));
    const bytes=await page.evaluate(async()=>{
      const c=window.ribbonReference.client;
      const result=await c.io.export({format:"docx"});
      if(!result.ok)throw Error(JSON.stringify(result.error));
      const bytes=[...new Uint8Array(await result.value.blob.arrayBuffer())];
      const opened=await c.io.import({format:"docx",data:result.value.blob});
      if(!opened.ok)throw Error(JSON.stringify(opened.error));
      return bytes;
    });
    await writeFile(resolve(output,theme+"-"+width+"-index.docx"),new Uint8Array(bytes));
    const reopened=await snapshot(page);
    assert.deepEqual(reopened.instructions,updated.instructions);
    assert.ok(reopened.texts.includes("Água, 1"));
    assert.ok(reopened.texts.includes("Licitação, 1"));
    assert.ok(reopened.emphasized.includes("1"));
    assert.deepEqual(errors,[]);
    records.push({sha,dirty,engine,theme,locale,width,checks:["mark","insert","update","undo-redo","read-only","docx-roundtrip"]});
    await page.close();
  }
  await writeVerification(output,records);
  console.log("Verified INDEX authoring in "+records.length+" Ribbon layouts.");
}finally{await browser.close();}
