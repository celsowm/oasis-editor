import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  EditorDocument,
  EditorParagraphNode,
  EditorTableNode,
} from "../../../../src/core/model.js";
import { importDocxToEditorDocument } from "../../../../src/import/docx/importDocxToEditorDocument.js";

const FIXTURES_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "word-parity",
  "fixtures",
);
export const COMPLEX_DOCX = join(FIXTURES_DIR, "documento_complexo.docx");
export const LOREM_COMPLEX_DOCX = join(
  FIXTURES_DIR,
  "lorem_ipsum_complex_document.docx",
);

export function pdfColorCommand(color: string, operator: "rg" | "RG"): string {
  const normalized = color.replace("#", "");
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  return `${Number(r.toFixed(3))} ${Number(g.toFixed(3))} ${Number(b.toFixed(3))} ${operator}`;
}

export function getDocumentParagraphs(
  document: EditorDocument,
): EditorParagraphNode[] {
  const blocks = document.sections?.flatMap((section) => section.blocks) ?? [];
  return blocks.filter(
    (block): block is EditorParagraphNode => block.type === "paragraph",
  );
}

export function getDocumentTables(document: EditorDocument): EditorTableNode[] {
  const blocks = document.sections?.flatMap((section) => section.blocks) ?? [];
  return blocks.filter(
    (block): block is EditorTableNode => block.type === "table",
  );
}

export async function importComplexDocument(): Promise<EditorDocument> {
  const docxBuffer = await readFile(COMPLEX_DOCX);
  return importDocxToEditorDocument(
    docxBuffer.buffer.slice(
      docxBuffer.byteOffset,
      docxBuffer.byteOffset + docxBuffer.byteLength,
    ),
  );
}

export async function importLoremComplexDocument(): Promise<EditorDocument> {
  const docxBuffer = await readFile(LOREM_COMPLEX_DOCX);
  return importDocxToEditorDocument(
    docxBuffer.buffer.slice(
      docxBuffer.byteOffset,
      docxBuffer.byteOffset + docxBuffer.byteLength,
    ),
  );
}
