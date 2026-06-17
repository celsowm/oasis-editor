import type { EditorDocument } from "@/core/model.js";
import {
  fileExtension,
  type DocumentFormatImporter,
  type ImportProgressReporter,
} from "@/import/DocumentFormatImporter.js";
import { importHtmlToEditorDocument } from "./importHtmlToEditorDocument.js";

/**
 * Decodes the HTML bytes to a string, honouring a `<meta charset>` declaration
 * when present (defaulting to UTF-8).
 */
function decodeHtml(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  // Probe the first chunk as UTF-8 to look for a charset hint.
  const head = new TextDecoder("utf-8").decode(bytes.subarray(0, 2048));
  const match = head.match(/charset\s*=\s*["']?([\w-]+)/i);
  const charset = match?.[1]?.toLowerCase();

  if (charset && charset !== "utf-8" && charset !== "utf8") {
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      // Unknown/unsupported label: fall back to UTF-8.
    }
  }
  return new TextDecoder("utf-8").decode(bytes);
}

export const htmlImporter: DocumentFormatImporter = {
  id: "html",
  accept: [".html", ".htm"],
  matches(file: File): boolean {
    return this.accept.includes(fileExtension(file.name));
  },
  async import(
    buffer: ArrayBuffer,
    onProgress?: ImportProgressReporter,
  ): Promise<EditorDocument> {
    onProgress?.("opening");
    const html = decodeHtml(buffer);
    onProgress?.("parsing");
    const document = importHtmlToEditorDocument(html);
    onProgress?.("finishing");
    return document;
  },
};
