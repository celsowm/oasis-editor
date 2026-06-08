import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorRun,
} from "../../core/editorState.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import {
  getDocumentParagraphs,
  type EditorParagraphNode,
  type EditorTextBoxData,
  type EditorTextRun,
} from "../../core/model.js";

/**
 * Loads the real `caixa_texto.docx` fixture shipped at the repo root. Used by
 * the smoke test below to ensure the export pipeline works end-to-end against
 * the unmodified Word output (no `proofErr`/`w14:*` magic comments, full
 * `mc:AlternateContent` Choice + VML Fallback, etc.).
 */
async function loadRealCaixaTextoDocx(): Promise<ArrayBuffer> {
  const path = resolve(process.cwd(), "caixa_texto.docx");
  const buf = await readFile(path);
  // Copy into a fresh ArrayBuffer so consumers can pass it to JSZip without
  // worrying about Node Buffer's pool-relative slice semantics.
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

function findTextBoxRun(
  paragraphs: EditorParagraphNode[],
): EditorTextRun | undefined {
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      if (run.textBox) return run;
    }
  }
  return undefined;
}

function findRunWithText(
  paragraphs: EditorParagraphNode[],
  needle: string,
): EditorTextRun | undefined {
  for (const paragraph of paragraphs) {
    for (const run of paragraph.runs) {
      if (run.text.includes(needle)) return run;
    }
  }
  return undefined;
}

function makeTextBox(overrides: Partial<EditorTextBoxData>): EditorTextBoxData {
  return {
    width: 200,
    height: 100,
    blocks: [],
    ...overrides,
  };
}

describe("DOCX export: text boxes (wps:wsp)", () => {
  it("serializes an anchored text box as a wps:wsp drawing", async () => {
    const textBoxRun = createEditorRun("\uFFFC");
    textBoxRun.textBox = makeTextBox({
      width: 200,
      height: 100,
      blocks: [
        {
          id: "p1",
          type: "paragraph",
          runs: [{ id: "r1", text: "hello from a text box" }],
        },
      ],
      floating: {
        type: "floating",
        distT: 45720,
        distB: 45720,
        distL: 114300,
        distR: 114300,
        positionH: { relativeFrom: "column", offset: -275590 },
        positionV: { relativeFrom: "paragraph", offset: 87630 },
        wrap: "square",
      },
      shape: {
        preset: "rect",
        fill: "#FFFFFF",
        borderColor: "#000000",
        borderWidthPt: 0.75,
      },
      body: {
        paddingLeft: 10,
        paddingTop: 5,
        paddingRight: 10,
        paddingBottom: 5,
        anchor: "t",
        wrap: "square",
        autoFit: true,
      },
      name: "Text Box 1",
    });

    const paragraph = createEditorParagraph("");
    paragraph.runs = [textBoxRun];

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const archive = await JSZip.loadAsync(buffer);
    const xml = (await archive.file("word/document.xml")?.async("string")) ?? "";

    // wp:anchor wrapper with the original offset values.
    expect(xml).toContain('distL="114300"');
    expect(xml).toContain('distR="114300"');
    expect(xml).toContain(
      '<wp:positionH relativeFrom="column"><wp:posOffset>-275590</wp:posOffset></wp:positionH>',
    );
    expect(xml).toContain(
      '<wp:positionV relativeFrom="paragraph"><wp:posOffset>87630</wp:posOffset></wp:positionV>',
    );
    expect(xml).toContain('<wp:wrapSquare wrapText="bothSides"/>');

    // wps:wsp graphic payload.
    expect(xml).toContain(
      '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">',
    );
    expect(xml).toContain("<wps:wsp>");
    expect(xml).toContain('prst="rect"');
    expect(xml).toContain('srgbClr val="FFFFFF"');
    expect(xml).toContain('srgbClr val="000000"');
    expect(xml).toContain("<a:spAutoFit/>");
    expect(xml).toContain('lIns="95250"'); // 10 px * 9525
    expect(xml).toContain("hello from a text box");
  });

  it("round-trips a hand-built text box without duplicating its content", async () => {
    const textBoxRun = createEditorRun("\uFFFC");
    textBoxRun.textBox = makeTextBox({
      width: 248,
      height: 148,
      blocks: [
        {
          id: "inner",
          type: "paragraph",
          runs: [{ id: "inner-r", text: "insidebox" }],
        },
      ],
      floating: {
        type: "floating",
        wrap: "square",
        positionH: { relativeFrom: "column", offset: -275590 },
        positionV: { relativeFrom: "paragraph", offset: 87630 },
      },
      shape: { preset: "rect", fill: "#FFFFFF" },
      body: { anchor: "t", autoFit: true },
      name: "Caixa de Texto 2",
    });
    const sibling = createEditorRun("normaltext");

    const paragraph = createEditorParagraph("");
    paragraph.runs = [textBoxRun, sibling];

    const buffer = await exportEditorDocumentToDocx(
      createEditorDocument([paragraph]),
    );
    const doc2 = await importDocxToEditorDocument(buffer);
    const paragraphs2 = getDocumentParagraphs(doc2);
    const reimported = findTextBoxRun(paragraphs2);
    expect(reimported).toBeDefined();
    expect(reimported!.text).toBe("\uFFFC");
    expect(reimported!.textBox?.blocks).toHaveLength(1);
    const inner = reimported!.textBox!.blocks[0]! as EditorParagraphNode;
    const innerText = inner.runs.map((r) => r.text).join("");
    expect(innerText).toBe("insidebox");

    // Sibling text survives the round-trip.
    const siblingRun = findRunWithText(paragraphs2, "normaltext");
    expect(siblingRun).toBeDefined();
    expect(siblingRun!.text).toBe("normaltext");

    // No duplication: the concatenated body text contains "normaltext" once
    // and the inside textbox text contains "insidebox" once.
    const allBodyText = paragraphs2
      .flatMap((p) => p.runs)
      .filter((r) => !r.textBox)
      .map((r) => r.text)
      .join("");
    expect(allBodyText.match(/normaltext/g)?.length ?? 0).toBe(1);
    expect(innerText.match(/insidebox/g)?.length ?? 0).toBe(1);
  });

  it("round-trips the real caixa_texto.docx fixture", async () => {
    const original = await loadRealCaixaTextoDocx();
    const doc1 = await importDocxToEditorDocument(original);
    const paragraphs1 = getDocumentParagraphs(doc1);
    const textBoxRun1 = findTextBoxRun(paragraphs1);
    expect(textBoxRun1, "real fixture must contain a text box run").toBeDefined();
    expect(textBoxRun1!.text).toBe("\uFFFC");
    const inner1 = (textBoxRun1!.textBox!.blocks[0]! as EditorParagraphNode)
      .runs.map((r) => r.text)
      .join("");
    expect(inner1).toBe("insidebox");
    // The sibling body text "normaltext" must survive the import.
    expect(findRunWithText(paragraphs1, "normaltext")).toBeDefined();

    // Export and re-import; both texts and the text box geometry must persist.
    const exported = await exportEditorDocumentToDocx(doc1);
    const doc2 = await importDocxToEditorDocument(exported);
    const paragraphs2 = getDocumentParagraphs(doc2);
    const textBoxRun2 = findTextBoxRun(paragraphs2);
    expect(textBoxRun2).toBeDefined();
    expect(textBoxRun2!.text).toBe("\uFFFC");
    const inner2 = (textBoxRun2!.textBox!.blocks[0]! as EditorParagraphNode)
      .runs.map((r) => r.text)
      .join("");
    expect(inner2).toBe("insidebox");
    expect(findRunWithText(paragraphs2, "normaltext")).toBeDefined();

    // Floating offsets, shape and body properties survive (within EMU/px
    // rounding tolerance).
    const floating = textBoxRun2!.textBox!.floating!;
    expect(floating.positionH?.offset).toBe(-275590);
    expect(floating.positionV?.offset).toBe(87630);
    expect(floating.wrap).toBe("square");
    expect(textBoxRun2!.textBox!.shape?.preset).toBe("rect");
    expect(textBoxRun2!.textBox!.shape?.fill).toBe("#FFFFFF");
    expect(textBoxRun2!.textBox!.body?.autoFit).toBe(true);

    // No duplication: the inside text appears exactly once in the txbx body
    // and the sibling text appears exactly once in the body.
    expect(inner2.match(/insidebox/g)?.length ?? 0).toBe(1);
    const bodyText = paragraphs2
      .flatMap((p) => p.runs)
      .filter((r) => !r.textBox)
      .map((r) => r.text)
      .join("");
    expect(bodyText.match(/normaltext/g)?.length ?? 0).toBe(1);
  });
});
