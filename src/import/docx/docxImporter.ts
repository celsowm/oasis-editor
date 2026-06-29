import type { EditorDocument } from "@/core/model.js";
import {
  fileExtension,
  type DocumentFormatImporter,
  type ImportProgressReporter,
  type ImportStage,
} from "@/import/DocumentFormatImporter.js";
import { importDocxInWorker } from "./importDocxInWorker.js";
import type { DocxImportStage } from "./importDocxToEditorDocument.js";

const DOCX_STAGE_TO_IMPORT_STAGE: Record<DocxImportStage, ImportStage> = {
  "opening-docx": "opening",
  "parsing-document": "parsing",
  "parsing-headers-footers": "finishing",
};

export const docxImporter: DocumentFormatImporter = {
  id: "docx",
  accept: [".docx"],
  matches(file: File): boolean {
    return this.accept.includes(fileExtension(file.name));
  },
  import(
    buffer: ArrayBuffer,
    onProgress?: ImportProgressReporter,
  ): Promise<EditorDocument> {
    return importDocxInWorker(buffer, {
      onProgress: onProgress
        ? (stage, progress): void =>
            onProgress(DOCX_STAGE_TO_IMPORT_STAGE[stage], progress)
        : undefined,
    });
  },
};
