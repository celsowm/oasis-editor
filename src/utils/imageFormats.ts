/**
 * Shared mapping between image file extensions and MIME types for the DOCX
 * image pipeline (`word/media/*`). Keeping a single source of truth ensures
 * import (path → MIME) and export (MIME → extension + content type) stay
 * consistent across the supported raster and vector formats.
 *
 * See `docs/ooxml.md` ("Package / OPC", `word/media/*`).
 */

/** Extension (lowercase, no dot) → MIME type. */
const EXTENSION_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  bmp: "image/bmp",
  tif: "image/tiff",
  tiff: "image/tiff",
  svg: "image/svg+xml",
  emf: "image/x-emf",
  wmf: "image/x-wmf",
};

/** MIME type → canonical file extension (lowercase, no dot). */
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tif",
  "image/svg+xml": "svg",
  "image/x-emf": "emf",
  "image/x-wmf": "wmf",
};

/** Resolve the MIME type for an image path/filename, or `null` if unknown. */
export function imageMimeFromPath(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) {
    return null;
  }
  return EXTENSION_TO_MIME[ext] ?? null;
}

/** Resolve the canonical file extension for an image MIME type, or `null`. */
export function imageExtensionFromMime(mime: string): string | null {
  return MIME_TO_EXTENSION[mime.toLowerCase()] ?? null;
}

/** Content-type `<Default>` entries for the given set of file extensions. */
export function imageContentTypeDefaults(extensions: Iterable<string>): string {
  const seen = new Set<string>();
  let xml = "";
  for (const ext of extensions) {
    const lower = ext.toLowerCase();
    if (seen.has(lower)) {
      continue;
    }
    const mime = EXTENSION_TO_MIME[lower];
    if (!mime) {
      continue;
    }
    seen.add(lower);
    xml += `<Default Extension="${lower}" ContentType="${mime}"/>`;
  }
  return xml;
}
