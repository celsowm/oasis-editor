import type { DocumentFormatImporter } from "./DocumentFormatImporter.js";
import { docxImporter } from "./docx/docxImporter.js";
import { htmlImporter } from "./html/htmlImporter.js";

/**
 * Ordered list of available document importers. Register a new format here and
 * the file `<input accept>`, format detection, and import controller all pick
 * it up automatically.
 */
const IMPORTERS: readonly DocumentFormatImporter[] = [
  docxImporter,
  htmlImporter,
];

/**
 * Finds the importer that can handle the given file.
 * @param file - The file to check.
 * @returns The matching importer, or undefined.
 */
export function resolveImporterForFile(
  file: File,
): DocumentFormatImporter | undefined {
  return IMPORTERS.find((importer): boolean => importer.matches(file));
}

/** @returns A comma-separated extension list for an `<input type="file" accept>`. */
export function importFileAccept(): string {
  return IMPORTERS.flatMap(
    (importer): readonly string[] => importer.accept,
  ).join(",");
}
