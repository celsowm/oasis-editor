import type { ImportStage } from "@/import/DocumentFormatImporter.js";

/**
 * Import progress vocabulary shared by the document IO hook and the
 * `DocumentImporter` it drives. Kept in its own leaf module so the importer can
 * reference the phase type without importing the hook (which imports the
 * importer), avoiding a cycle.
 */
export type ImportProgressPhase =
  | "reading-file"
  | ImportStage
  | "applying-editor-state"
  | "stabilizing-layout"
  | "done"
  | "error";

export interface ImportProgressState {
  phase: ImportProgressPhase;
  progress: number;
  subProgress?: number;
}
