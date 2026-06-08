/**
 * Footnote body type. Lives in its own file because it forward-references
 * EditorBlockNode from `types/nodes.ts` while being referenced by
 * `types/document.ts`. Extracting it breaks what would otherwise be a
 * circular type dependency.
 */
import type { EditorBlockNode } from "./nodes.js";

export interface EditorFootnote {
  id: string;
  blocks: EditorBlockNode[];
  /** Original DOCX `w:id`, kept for round-trip diagnostics only. */
  docxId?: number;
}
