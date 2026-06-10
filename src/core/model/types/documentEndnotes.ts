/**
 * Endnote body type. Mirrors `documentFootnotes.ts` and lives in its own file
 * to avoid a circular type dependency: it forward-references EditorBlockNode
 * from `types/nodes.ts` while being referenced by `types/document.ts`.
 */
import type { EditorBlockNode } from "./nodes.js";

export interface EditorEndnote {
  id: string;
  blocks: EditorBlockNode[];
  /** Original DOCX `w:id`, kept for round-trip diagnostics only. */
  docxId?: number;
}
