#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { createSuite, openGroup, loadFixture, waitForRibbonSettled, writeVerification } from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";
const { base, engine, output, records, browser, sha } = await createSuite("watermark");
try {
  for (const locale of ["en","pt-BR"]) for (const theme of ["light","dark"]) for (const ribbonStyle of ["classic","simplified"]) {
    const width = ribbonStyle === "classic" ? 1440 : 480;
    const page = await browser.newPage({viewport:{width:1440,height:900}});
    const errors = [];
    page.on("pageerror", e=>errors.push(e.message));
    const read = () => page.evaluate(()=>window.ribbonReference.client.commands.state("setDocumentWatermark").value ?? null);
    const open = async () => {
      const gallery = page.getByTestId("editor-watermark-gallery").filter({visible:true});
      if (!(await gallery.count())) {
        await waitForRibbonSettled(page);
        await (await openGroup(page,"pageBackground","editor-toolbar-design-watermark")).click();
      }
      await expect(gallery).toBeVisible();
      return gallery;
    };
    const custom = async () => {
      const gallery = await open();
      await gallery.getByTestId("editor-watermark-custom").click();
      const dialog = page.getByTestId("editor-watermark-dialog");
      await expect(dialog).toBeVisible();
      return dialog;
    };
    try {
      await page.goto(`${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}&ribbonStyle=${ribbonStyle}`);
      await waitForRibbonReference(page);
      await loadFixture(page,"text");
      await page.evaluate(()=>window.ribbonReference.client.commands.execute("setDocumentWatermark",null));
      await page.locator("#ribbon-reference-root").evaluate((el,w)=>{el.style.width=w+"px"},width);
      await page.getByTestId("editor-ribbon-tab-design").click();
      await waitForRibbonSettled(page);
      let gallery=await open();
      await expect(gallery.locator(".oasis-editor-watermark-card")).toHaveCount(6);
      await expect(gallery.getByTestId("editor-watermark-remove")).toBeDisabled();
      const prefix=`${theme}-${locale}-${ribbonStyle}`;
      await gallery.screenshot({path:resolve(output,prefix+"-gallery.png")});
      const doc=await read();
      await gallery.getByTestId("editor-watermark-preset-draft").hover();
      assert.deepEqual(await read(),doc,"Hover must not mutate watermark");
      await gallery.getByTestId("editor-watermark-preset-draft").click();
      await page.waitForFunction(expected=>window.ribbonReference.client.commands.state("setDocumentWatermark").value?.text===expected,locale==="pt-BR"?"RASCUNHO":"DRAFT");
      const applied=await read();
      gallery=await open();
      await expect(gallery.getByTestId("editor-watermark-preset-draft")).toHaveAttribute("aria-pressed","true");
      let dialog=await custom();
      await dialog.getByTestId("editor-watermark-text").fill("CUSTOM");
      await dialog.getByTestId("editor-watermark-transparency").fill("40");
      assert.deepEqual(await read(),applied,"Draft must not mutate watermark");
      await dialog.screenshot({path:resolve(output,prefix+"-custom.png")});
      await dialog.getByTestId("editor-watermark-cancel").click();
      await expect(dialog).toHaveCount(0);
      assert.deepEqual(await read(),applied);
      dialog=await custom();
      await dialog.getByTestId("editor-watermark-text").fill("CUSTOM");
      await dialog.getByTestId("editor-watermark-transparency").fill("101");
      await expect(dialog.getByTestId("editor-watermark-apply")).toBeDisabled();
      await dialog.getByTestId("editor-watermark-transparency").fill("40");
      await dialog.getByTestId("editor-watermark-rotation").fill("0");
      await dialog.getByTestId("editor-watermark-apply").click();
      await expect(dialog).toHaveCount(0);
      await page.waitForFunction(()=>{const w=window.ribbonReference.client.commands.state("setDocumentWatermark").value;return w?.text==="CUSTOM"&&w?.opacity===.6&&w?.rotation===0});
      const text=await read();
      dialog=await custom();
      await dialog.getByTestId("editor-watermark-kind").selectOption("image");
      await dialog.getByTestId("editor-watermark-image").setInputFiles({name:"sample.svg",mimeType:"image/svg+xml",buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="blue"/></svg>')});
      await expect(dialog.getByTestId("editor-watermark-apply")).toBeEnabled();
      assert.deepEqual(await read(),text,"Image selection must remain local until Apply");
      await dialog.getByTestId("editor-watermark-apply").click();
      await page.waitForFunction(()=>window.ribbonReference.client.commands.state("setDocumentWatermark").value?.kind==="image");
      const image=await read();
      assert.ok(image.src.startsWith("data:image/svg+xml"));
      gallery=await open();
      await gallery.getByTestId("editor-watermark-remove").click();
      await page.waitForFunction(()=>!window.ribbonReference.client.commands.state("setDocumentWatermark").value);
      await page.evaluate(()=>window.ribbonReference.client.history.undo());
      assert.deepEqual(await read(),image);
      await page.evaluate(()=>window.ribbonReference.client.history.redo());
      assert.equal(await read(),null);
      await page.evaluate(()=>window.ribbonReference.client.ui.setReadOnly(true));
      await waitForRibbonSettled(page);
      const trigger=await openGroup(page,"pageBackground","editor-toolbar-design-watermark");
      await expect(trigger).toBeDisabled();
      assert.deepEqual(errors,[]);
      records.push({sha,engine,locale,theme,ribbonStyle,width,checks:["six presets","hover non-mutating","preset selection","cancel","numeric validation","text apply","image draft and apply","remove undo redo","read-only"]});
    } finally { await page.close(); }
  }
  assert.equal(records.length,8);
} finally {
  await writeVerification(output,{sha,engine,records});
  await browser.close();
}
