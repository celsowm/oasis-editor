import { describe, it } from "vitest";
import {
  detectWordLayoutParitySupport,
  verifyWordLayoutParity,
} from "../../testing/wordLayoutParity.js";
import { createA4CalibriLoremSinglePageDocument } from "./fixtures/loremFixtures.js";

const support = detectWordLayoutParitySupport();
const d = support.supported ? describe : describe.skip;

d("diag", () => {
  it("single page", async () => {
    const doc = createA4CalibriLoremSinglePageDocument();
    const res = await verifyWordLayoutParity(doc);
    const ep = res.editor.pages[0]!;
    const wp = res.word.pages[0]!;
    console.log("EDITOR body lines:");
    for (const t of ep.bodyLineTexts) console.log("  E|", t);
    console.log("WORD lines (all):");
    for (const l of wp.lines)
      console.log(
        `  W| y=${l.y.toFixed(2)} x=${l.x.toFixed(2)} w=${l.width.toFixed(2)} h=${l.height.toFixed(2)} | ${l.text}`,
      );
    console.log("editor firstBodyLineGeometry:", ep.firstBodyLineGeometry);
    console.log("editor bodyTop(px):", ep.bodyTop);
    console.log("mismatches:", res.mismatches);
  });
});
