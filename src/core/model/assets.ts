/**
 * Asset registry: resolve `asset:<id>` references inside image runs to the
 * concrete URL stored in `EditorDocument.assets`.
 */
import type { EditorDocument } from "./types/document.js";
import { EDITOR_ASSET_REF_PREFIX } from "./types/primitives.js";

/**
 * Resolve an `asset:<id>` reference (or pass through any other src) to the
 * actual URL using the document's asset registry.
 */
export function resolveImageSrc(
  document: Pick<EditorDocument, "assets"> | undefined,
  src: string | undefined,
): string {
  if (!src) {
    return "";
  }
  if (!src.startsWith(EDITOR_ASSET_REF_PREFIX)) {
    return src;
  }
  const id = src.slice(EDITOR_ASSET_REF_PREFIX.length);
  const asset = document?.assets?.[id];
  return asset?.url ?? src;
}
