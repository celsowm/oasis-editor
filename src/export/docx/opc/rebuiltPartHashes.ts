import JSZip from "jszip";
import type { EditorDocument } from "@/core/model.js";
import { normalizeOpcPartPath } from "@/ooxml/opc/packageXml.js";
import { exportEditorDocumentToDocx } from "../exportEditorDocumentToDocx.js";

export function hashDocxPartBytes(bytes: Uint8Array): string {
  let hash = 0x811c9dc5;
  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export async function hashRebuiltDocxParts(
  buffer: ArrayBuffer,
): Promise<Record<string, string>> {
  const zip = await JSZip.loadAsync(buffer);
  const hashes: Record<string, string> = {};

  for (const [rawPath, entry] of Object.entries(zip.files)) {
    if (entry.dir) {
      continue;
    }
    const path = normalizeOpcPartPath(rawPath);
    hashes[path] = hashDocxPartBytes(await entry.async("uint8array"));
  }

  return hashes;
}

export async function captureRebuiltDocxPartHashes(
  document: EditorDocument,
): Promise<Record<string, string>> {
  return hashRebuiltDocxParts(await exportEditorDocumentToDocx(document));
}
