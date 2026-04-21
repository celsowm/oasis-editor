import { DocumentModel } from "../document/DocumentTypes.js";
import { EditorSelection } from "../selection/SelectionTypes.js";
import { MarkSet } from "../document/BlockTypes.js";

export interface EditorState {
  document: DocumentModel;
  selection: EditorSelection | null;
  pendingMarks?: MarkSet;
  selectedImageId?: string | null;
}
