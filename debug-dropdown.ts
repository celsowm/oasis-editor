import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173'); 
  await page.waitForSelector('#oasis-editor-template option');
  
  const templateHtml = await page.$eval('#oasis-editor-template', el => el.innerHTML);
  const fontFamilyHtml = await page.$eval('#oasis-editor-font-family', el => el.innerHTML);
  
  console.log('--- TEMPLATE SELECT ---');
  console.log(templateHtml);
  console.log('--- FONT FAMILY SELECT ---');
  console.log(fontFamilyHtml);
  
  await page.screenshot({ path: 'dropdown-debug.png' });
  await browser.close();
})();
