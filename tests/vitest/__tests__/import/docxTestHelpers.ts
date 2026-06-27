import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { unzlibSync } from "fflate";
import type {
  EditorDocument,
  EditorParagraphNode,
  EditorTableNode,
} from "@/core/model.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";

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

/**
 * Decodes a PDF blob to a searchable string. Page content streams are
 * FlateDecode-compressed, so each /FlateDecode stream's data is inflated and
 * spliced in place, keeping content operators searchable.
 */
export function decodePdf(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let raw = "";
  for (let i = 0; i < bytes.length; i += 1) {
    raw += String.fromCharCode(bytes[i]!);
  }
  let out = "";
  let copiedTo = 0;
  let cursor = 0;
  for (;;) {
    const at = raw.indexOf("/FlateDecode", cursor);
    if (at === -1) break;
    const streamStart = raw.indexOf("stream\n", at);
    if (streamStart === -1) break;
    const dataStart = streamStart + "stream\n".length;
    const dataEnd = raw.indexOf("\nendstream", dataStart);
    if (dataEnd === -1) break;
    const compressed = new Uint8Array(dataEnd - dataStart);
    for (let i = 0; i < compressed.length; i += 1) {
      compressed[i] = raw.charCodeAt(dataStart + i) & 0xff;
    }
    try {
      out += raw.slice(copiedTo, dataStart) + new TextDecoder().decode(
        unzlibSync(compressed),
      );
      copiedTo = dataEnd;
    } catch {
      // Not a real inflate match; leave bytes untouched.
    }
    cursor = dataEnd + 1;
  }
  out += raw.slice(copiedTo);
  return out;
}

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
