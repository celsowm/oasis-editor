import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { exportEditorDocumentToDocx } from "@/export/docx/exportEditorDocumentToDocx.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { isPresetGeometrySupported } from "@/layoutProjection/presetGeometry.js";
import type {
  EditorBlockNode,
  EditorDocument,
  EditorParagraphNode,
  EditorTableNode,
  EditorTextRun,
} from "@/core/model.js";

const SHAPE_FIXTURE = resolve(process.cwd(), "ooxml_formas_st_shapetype.docx");

async function loadShapeFixture(): Promise<ArrayBuffer> {
  const buffer = await readFile(SHAPE_FIXTURE);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
}

function collectShapeRuns(document: EditorDocument): EditorTextRun[] {
  const runs: EditorTextRun[] = [];
  const visitParagraph = (paragraph: EditorParagraphNode): void => {
    runs.push(...paragraph.runs.filter((run) => run.textBox?.shape?.preset));
  };
  const visitTable = (table: EditorTableNode): void => {
    for (const row of table.rows) {
      for (const cell of row.cells) {
        for (const block of cell.blocks) {
          visitBlock(block);
        }
      }
    }
  };
  const visitBlock = (block: EditorBlockNode): void => {
    if (block.type === "paragraph") {
      visitParagraph(block);
    } else {
      visitTable(block);
    }
  };

  for (const section of document.sections ?? []) {
    for (const block of section.blocks) {
      visitBlock(block);
    }
  }
  return runs;
}

describe("DOCX import: DrawingML preset shapes (wps:wsp)", () => {
  it("imports every ST_ShapeType shape from the real fixture", async () => {
    const document = await importDocxToEditorDocument(await loadShapeFixture());
    const shapeRuns = collectShapeRuns(document);
    const presets = shapeRuns.map((run) => run.textBox!.shape!.preset!);
    const uniquePresets = new Set(presets);

    expect(shapeRuns).toHaveLength(187);
    expect(uniquePresets.size).toBe(187);
    expect([...uniquePresets].every(isPresetGeometrySupported)).toBe(true);

    const first = shapeRuns[0]!.textBox!;
    expect(shapeRuns[0]!.text).toBe("\uFFFC");
    expect(first.name).toBe("line");
    expect(first.alt).toBe("OOXML ST_ShapeType preset geometry: line");
    expect(first.width).toBe(Math.round(756000 / 9525));
    expect(first.height).toBe(Math.round(432000 / 9525));
    expect(first.blocks).toHaveLength(0);
    expect(first.shape).toMatchObject({
      preset: "line",
      fill: "#D9EAD3",
      borderColor: "#38761D",
      borderWidthPt: Math.round((12700 / 12700) * 100) / 100,
    });
  });

  it("round-trips shape-only wps:wsp drawings without converting them to text boxes", async () => {
    const imported = await importDocxToEditorDocument(await loadShapeFixture());
    const exported = await exportEditorDocumentToDocx(imported);
    const archive = await JSZip.loadAsync(exported);
    const xml =
      (await archive.file("word/document.xml")?.async("string")) ?? "";

    expect((xml.match(/<wps:wsp>/g) ?? []).length).toBe(187);
    expect(xml).not.toContain("<w:txbxContent>");
    expect(xml).toContain('prst="line"');
    expect(xml).toContain('prst="wedgeRoundRectCallout"');

    const reimported = await importDocxToEditorDocument(exported);
    const shapeRuns = collectShapeRuns(reimported);
    const presets = new Set(
      shapeRuns.map((run) => run.textBox!.shape!.preset!),
    );

    expect(shapeRuns).toHaveLength(187);
    expect(presets.size).toBe(187);
    expect(shapeRuns[0]!.textBox!.name).toBe("line");
    expect(shapeRuns[0]!.textBox!.shape).toMatchObject({
      preset: "line",
      fill: "#D9EAD3",
      borderColor: "#38761D",
    });
  });
});
