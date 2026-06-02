import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { projectDocumentLayout } from "../../ui/layoutProjection.js";

const FIXTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "word-parity", "fixtures");
const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");

async function readComplexDocx(): Promise<ArrayBuffer> {
  const docxBuffer = await readFile(COMPLEX_DOCX);
  return docxBuffer.buffer.slice(
    docxBuffer.byteOffset,
    docxBuffer.byteOffset + docxBuffer.byteLength,
  );
}

describe("DOCX complex document smoke test", () => {
  it("imports and projects the complex document without dropping document structure", async () => {
    const document = await importDocxToEditorDocument(await readComplexDocx());
    const layout = projectDocumentLayout(document);
    const blocks = document.sections?.flatMap((section) => section.blocks) ?? [];
    const projectedBlocks = layout.pages.reduce((sum, page) => sum + page.blocks.length, 0);

    expect(document.sections).toHaveLength(1);
    expect(blocks.length).toBeGreaterThan(250);
    expect(layout.pages.length).toBeGreaterThan(10);
    expect(projectedBlocks).toBeGreaterThanOrEqual(blocks.length);
  });
});
