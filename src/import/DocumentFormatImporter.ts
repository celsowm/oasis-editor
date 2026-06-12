import type { EditorDocument } from "../core/model.js";

/**
 * Coarse, format-agnostic import stages. Each concrete importer maps its own
 * internal phases onto these so the progress UI does not need to know about any
 * specific file format.
 */
export type ImportStage = "opening" | "parsing" | "finishing";

export type ImportProgressReporter = (
  stage: ImportStage,
  progress?: number,
) => void;

/**
 * A pluggable document format importer. Adding support for a new format means
 * implementing this interface and registering it — no consumer of the import
 * pipeline (controller, UI) needs to change (Open/Closed, Dependency Inversion).
 */
export interface DocumentFormatImporter {
  /** Stable identifier, e.g. "docx" or "html". */
  readonly id: string;
  /** File extensions handled, lowercase and dot-prefixed, e.g. [".html", ".htm"]. */
  readonly accept: readonly string[];
  /** Whether this importer can handle the given file (by extension). */
  matches(file: File): boolean;
  /** Parse the raw bytes into an editor document. */
  import(
    buffer: ArrayBuffer,
    onProgress?: ImportProgressReporter,
  ): Promise<EditorDocument>;
}

/** Returns the lowercase dot-extension of a file name, e.g. ".html". */
export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}
