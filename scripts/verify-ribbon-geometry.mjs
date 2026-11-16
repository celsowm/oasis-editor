#!/usr/bin/env node
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { createSuite, loadFixture, waitForRibbonSettled, writeVerification } from "./lib/ribbon-suite.mjs";
import { readRibbonGeometry } from "./lib/ribbon-geometry.mjs";
import { waitForRibbonReference } from "./ribbon-reference-ready.mjs";

const { base,engine,output,records,browser,sha }=await createSuite("geometry");
const widths=[1440,1152,960,640,480,1440];
const failures=[];
const coverage=new Set();
try{
  for(const theme of ["light","dark"]) for(const locale of ["en","pt-BR"]){
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    const errors=[];
    page.on("pageerror",e=>errors.push(e.message));
    try{
      await page.goto(`${base}/tests/browser/ribbon/?theme=${theme}&locale=${locale}`);
      await waitForRibbonReference(page);
      for(const fixture of ["text","table","image","sections","review","styles"]){
        await loadFixture(page,fixture);
        const tabs=await page.locator('[role="tab"][data-testid^="editor-ribbon-tab-"]').evaluateAll(els=>els.map(el=>el.dataset.testid));
        const requested=fixture==="text"?tabs:tabs.filter(id=>
          fixture==="table"?/tableDesign|tableLayout/.test(id):
          fixture==="image"?id.endsWith("-imageFormat"):
          fixture==="sections"?id.endsWith("-layout"):
          fixture==="review"?id.endsWith("-review"):id.endsWith("-home"));
        assert.ok(requested.length,`Missing contextual coverage: ${fixture}`);
        for(const tab of requested){
          await page.getByTestId(tab).click();
          for(const [step,width] of widths.entries()){
            await page.locator("#ribbon-reference-root").evaluate((el,w)=>{el.style.width=`${w}px`},width);
            await waitForRibbonSettled(page);
            const evidence=await readRibbonGeometry(page);
            coverage.add(tab);
            const record={sha,engine,theme,locale,fixture,tab,width,step,...evidence};
            if(!evidence.groups.length) record.failures.push({rule:"empty-tab"});
            if(record.failures.length || step===0){
              record.screenshot=`${engine}-${theme}-${locale}-${fixture}-${tab}-${step}.png`;
              await page.screenshot({path:resolve(output,record.screenshot)});
            }
            records.push(record);
            for(const issue of record.failures) failures.push({theme,locale,fixture,tab,width,...issue});
          }
        }
      }
      for(const message of errors) failures.push({theme,locale,rule:"pageerror",message});
    }finally{await page.close();}
  }
  for(const tab of ["home","insert","design","layout","references","review","view","file","tableDesign","tableLayout","imageFormat"]){
    assert.ok(coverage.has(`editor-ribbon-tab-${tab}`),`Missing required tab ${tab}`);
  }
}finally{
  await writeVerification(output,{sha,engine,coverage:[...coverage],records,failures});
  await browser.close();
}
if(failures.length) {
  const byRule = Object.create(null);
  for (const failure of failures) {
    const key = failure.tab + "/" + (failure.group ?? "-") + "/" + failure.rule;
    (byRule[key] ??= { count: 0, example: failure }).count++;
  }
  console.error(JSON.stringify(byRule,null,2));
}
assert.equal(failures.length,0,`Ribbon geometry violations: ${failures.length}; see verification.json`);
