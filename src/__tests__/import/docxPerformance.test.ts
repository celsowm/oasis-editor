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

describe("DOCX performance guardrails", () => {
  it("imports and projects the complex document within the local budget", async () => {
    const importStartedAt = performance.now();
    const document = await importDocxToEditorDocument(await readComplexDocx());
    const importDurationMs = performance.now() - importStartedAt;

    const layoutStartedAt = performance.now();
    const layout = projectDocumentLayout(document);
    const layoutDurationMs = performance.now() - layoutStartedAt;

    expect(layout.pages.length).toBeGreaterThan(1);
    expect(importDurationMs).toBeLessThan(5_000);
    expect(layoutDurationMs).toBeLessThan(1_000);
  });
});
