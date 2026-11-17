#!/usr/bin/env node
/** Reproduce outside dismissal using actual browser input on the editor canvas.
 * No synthetic mousedown: the real surface prevents pointerdown's default. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { expect } from "@playwright/test";
import { createSuite, openGroup, selectRangeInParagraph, writeVerification } from "./lib/ribbon-suite.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const { base, engine, output, sha, browser, records } = await createSuite("popup-dismissal");
const palette = page => page.locator(".oasis-editor-color-menu:visible");
const gallery = page => page.getByTestId("editor-toolbar-style-panel");
const collapsed = page => page.locator(".oasis-editor-ribbon-collapsed-menu:visible");
const control = (page, group, id) => openGroup(page, group, "editor-toolbar-"+id);
async function documentSnapshot(page) {
  return page.evaluate(() => {
    const client=window.ribbonReference.client;
    return {document:JSON.stringify(client.document.get()),undo:client.history.canUndo(),redo:client.history.canRedo(),dirty:client.document.isDirty()};
  });
}
/** Find a point actually exposed on the page, not behind a portal. The
 * document can extend below the viewport and its canvas can be covered by
 * selection overlays, so a locator's center is not necessarily a real hit. */
async function pagePoint(page) {
  return page.evaluate(() => {
    const paper=document.querySelector('[data-testid="editor-page"][data-renderer="canvas"]');
    if (!paper?.querySelector("canvas")) throw Error("No canvas document page");
    const rect=paper.getBoundingClientRect();
    const left=Math.max(2,rect.left+16),right=Math.min(innerWidth-2,rect.right-16);
    const top=Math.max(2,rect.top+Math.min(100,rect.height/4)),bottom=Math.min(innerHeight-32,rect.bottom-24);
    for(let y=top;y<bottom;y+=28)for(let x=left;x<right;x+=28){
      const el=document.elementFromPoint(x,y);
      if(el&&paper.contains(el)&&!el.closest('[role="menu"],[role="dialog"]'))return {x,y};
    }
    throw Error("No exposed canvas point for outside interaction");
  });
}
async function dismissOnDocument(page,touch) {
  const point=await pagePoint(page);
  if(touch)await page.touchscreen.tap(point.x,point.y);
  else await page.mouse.click(point.x,point.y);
  await expect(palette(page)).toHaveCount(0);
  await expect(gallery(page)).toHaveCount(0);
  await expect(collapsed(page)).toHaveCount(0);
}
try {
  for(const width of [1440,640]){
    for(const touch of [false,true]){
      // Keep the full desktop and responsive pointer paths; touch uses the
      // same app and actual browser touch input, not dispatched DOM events.
      const page=await browser.newPage({viewport:{width,height:900},hasTouch:touch});
      const errors=[];
      page.on("pageerror",error=>errors.push(error.message));
      try{
        await page.goto(base+"/tests/browser/ribbon/?theme=light&locale=pt-BR");
        await waitForRibbonReference(page);
        await selectRangeInParagraph(page,1,0,6);
        for(const id of ["color","highlight","text-shading"]){
          const trigger=await control(page,"font",id+"-dropdown");
          const before=await documentSnapshot(page);
          await trigger.click();
          await expect(palette(page)).toHaveCount(1);
          await expect(trigger).toHaveAttribute("aria-expanded","true");
          // Clicking within the palette must not be mistaken for outside.
          const panel=palette(page);
          const point=await panel.evaluate(el=>{
            const r=el.getBoundingClientRect();
            for(const x of [r.left+2,r.right-2])for(const y of [r.top+2,r.bottom-2]){
              if(document.elementFromPoint(x,y)===el)return {x,y};
            }
            return null;
          });
          if(point){
            await page.mouse.click(point.x,point.y);
            await expect(panel).toHaveCount(1);
          }
          await dismissOnDocument(page,touch);
          assert.deepEqual(await documentSnapshot(page),before,"Dismissal changed document/history: "+id);
          records.push({sha,engine,width,touch,scenario:id+"-outside",passed:true});
        }
        const expand=await control(page,"styles","style-expand");
        const before=await documentSnapshot(page);
        await expand.click();
        await expect(gallery(page)).toBeVisible();
        await dismissOnDocument(page,touch);
        assert.deepEqual(await documentSnapshot(page),before,"Gallery dismissal changed document/history");
        records.push({sha,engine,width,touch,scenario:"style-gallery-outside",passed:true});

        // A real press on a different control should switch panels with one
        // click; both color triggers belong to the same font group.
        const font=await control(page,"font","color-dropdown");
        const highlight=await control(page,"font","highlight-dropdown");
        await font.click();
        await expect(palette(page)).toHaveCount(1);
        await highlight.click();
        await expect(palette(page)).toHaveCount(1);
        await expect(highlight).toHaveAttribute("aria-expanded","true");
        await expect(font).toHaveAttribute("aria-expanded","false");
        await page.keyboard.press("Escape");
        await expect(palette(page)).toHaveCount(0);
        // The collapsed group, if present, is still open after child Escape.
        if(await collapsed(page).count()){
          await expect(collapsed(page)).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(collapsed(page)).toHaveCount(0);
        }
        records.push({sha,engine,width,touch,scenario:"switch-and-escape",passed:true});
        await page.screenshot({path:resolve(output,"closed-"+width+"-"+(touch?"touch":"mouse")+".png")});
        assert.deepEqual(errors,[]);
      }finally{await page.close();}
    }
  }
  await writeVerification(output,{sha,engine,records});
}finally{await browser.close();}
