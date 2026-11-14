import { chromium } from "@playwright/test";
import { waitForRibbonReference } from "./scripts/ribbon-reference-ready.mjs";

const base = "http://127.0.0.1:5174";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`);
});
await page.goto(
  `${base}/tests/browser/ribbon/?fixture=text&theme=light&locale=en`,
);
await waitForRibbonReference(page);
await page.getByTestId("editor-ribbon-tab-layout").click();
await page.waitForTimeout(150);

// Check ribbon body height
const bodyHeight = await page.evaluate(() => {
  const toolbar = document.querySelector(".oasis-editor-toolbar");
  return toolbar ? toolbar.clientHeight : 0;
});
console.log("Ribbon body height:", bodyHeight);

// Check row heights
const rowHeights = await page.evaluate(() => {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    bodyHeight: getComputedStyle(document.documentElement).getPropertyValue("--oasis-ribbon-body-height").trim(),
    rowHeight: getComputedStyle(document.documentElement).getPropertyValue("--oasis-ribbon-row-height").trim(),
    rowGap: getComputedStyle(document.documentElement).getPropertyValue("--oasis-ribbon-row-gap").trim(),
    stackRowHeight: getComputedStyle(document.documentElement).getPropertyValue("--oasis-ribbon-stack-row-height").trim(),
    stackRowGap: getComputedStyle(document.documentElement).getPropertyValue("--oasis-ribbon-stack-row-gap").trim(),
    smallIcon: getComputedStyle(document.documentElement).getPropertyValue("--oasis-ribbon-small-icon").trim(),
  };
});
console.log("CSS variables:", rowHeights);

// Check a group's vertical spacing
const groups = document.querySelectorAll("[data-ribbon-group]");
console.log("Number of groups:", groups.length);
for (let i = 0; i < Math.min(groups.length, 3); i++) {
  const g = groups[i];
  const rect = g.getBoundingClientRect();
  console.log("Group", i, "height:", rect.height, "top:", rect.top);
}

console.log("errors", JSON.stringify(errors));
await browser.close();