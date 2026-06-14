import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
} from "../../../../src/core/model.js";
import { importDocxToEditorDocument } from "../../../../src/import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "../../../../src/export/docx/exportEditorDocumentToDocx.js";

/** Loads the real `ooxml_vertical_text_examples.docx` fixture at the repo root. */
async function loadVerticalDocx(): Promise<ArrayBuffer> {
  const path = resolve(process.cwd(), "ooxml_vertical_text_examples.docx");
  const buf = await readFile(path);
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

async function readDocumentXml(docx: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/document.xml")!.async("string");
}

interface VerticalSamples {
  paragraphDirections: Set<string>;
  cellDirections: Set<string>;
  textBoxVerts: Set<string>;
}

function walkParagraph(
  paragraph: EditorParagraphNode,
  out: VerticalSamples,
): void {
  if (paragraph.style?.textDirection) {
    out.paragraphDirections.add(paragraph.style.textDirection);
  }
  for (const run of paragraph.runs) {
    const textBox = run.textBox;
    if (textBox) {
      if (textBox.body?.vert) {
        out.textBoxVerts.add(textBox.body.vert);
      }
      for (const block of textBox.blocks) {
        walkBlock(block, out);
      }
    }
  }
}

function walkBlock(block: EditorBlockNode, out: VerticalSamples): void {
  if (block.type === "paragraph") {
    walkParagraph(block, out);
    return;
  }
  if (block.type === "table") {
    for (const row of block.rows) {
      for (const cell of row.cells) {
        if (cell.style?.textDirection) {
          out.cellDirections.add(cell.style.textDirection);
        }
        for (const cellBlock of cell.blocks) {
          walkBlock(cellBlock, out);
        }
      }
    }
  }
}

function collectVerticalSamples(document: EditorDocument): VerticalSamples {
  const out: VerticalSamples = {
    paragraphDirections: new Set(),
    cellDirections: new Set(),
    textBoxVerts: new Set(),
  };
  for (const section of document.sections ?? []) {
    for (const block of section.blocks) {
      walkBlock(block, out);
    }
  }
  return out;
}

describe("DOCX import: vertical text (w:textDirection + wps:bodyPr/@vert)", () => {
  it("parses paragraph, cell and text-box vertical directions", async () => {
    const document = await importDocxToEditorDocument(await loadVerticalDocx());
    const samples = collectVerticalSamples(document);

    expect(samples.paragraphDirections).toContain("tbRl");
    expect(samples.paragraphDirections).toContain("btLr");
    expect(samples.paragraphDirections).toContain("lrTbV");

    expect(samples.cellDirections).toContain("tbRl");
    expect(samples.cellDirections).toContain("btLr");
    expect(samples.cellDirections).toContain("tbRlV");

    expect(samples.textBoxVerts).toContain("vert");
    expect(samples.textBoxVerts).toContain("vert270");
    expect(samples.textBoxVerts).toContain("wordArtVert");
  });

  it("round-trips the directions through export and re-import", async () => {
    const document = await importDocxToEditorDocument(await loadVerticalDocx());
    const exported = await exportEditorDocumentToDocx(document);
    const xml = await readDocumentXml(exported);

    expect(xml).toContain('<w:textDirection w:val="tbRl"/>');
    expect(xml).toContain('<w:textDirection w:val="btLr"/>');
    expect(xml).toContain('<w:textDirection w:val="lrTbV"/>');
    expect(xml).toContain('<w:textDirection w:val="tbRlV"/>');
    expect(xml).toContain('vert="vert"');
    expect(xml).toContain('vert="vert270"');
    expect(xml).toContain('vert="wordArtVert"');

    const reimported = await importDocxToEditorDocument(exported);
    const samples = collectVerticalSamples(reimported);

    for (const dir of ["tbRl", "btLr", "lrTbV"]) {
      expect(samples.paragraphDirections).toContain(dir);
    }
    for (const dir of ["tbRl", "btLr", "tbRlV"]) {
      expect(samples.cellDirections).toContain(dir);
    }
    for (const vert of ["vert", "vert270", "wordArtVert"]) {
      expect(samples.textBoxVerts).toContain(vert);
    }
  });
});
