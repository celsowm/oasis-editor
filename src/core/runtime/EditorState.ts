import { DocumentModel } from "../document/DocumentTypes.js";
import { EditorSelection } from "../selection/SelectionTypes.js";
import { MarkSet } from "../document/BlockTypes.js";
import { IdGenerator } from "../utils/IdGenerator.js";

export interface EditorState {
  document: DocumentModel;
  selection: EditorSelection | null;
  idGenerator: IdGenerator;
  pendingMarks?: MarkSet;
  selectedImageId?: string | null;
  editingMode: "main" | "header" | "footer" | "footnote";
  editingFootnoteId?: string | null;
  trackChangesEnabled?: boolean;
}
