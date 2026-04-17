import { DocumentModel } from "../document/DocumentTypes.js";
import { EditorSelection } from "../selection/SelectionTypes.js";

export interface EditorState {
  document: DocumentModel;
  selection: EditorSelection | null;
}
