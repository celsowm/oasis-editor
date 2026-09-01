import type { EditorSdtBlockWrapper } from "./nodes.js";

declare module "./nodes.js" {
  interface EditorRunBase {
    /** Enclosing inline `w:sdt` content controls, outermost first. */
    sdtWrappers?: EditorSdtBlockWrapper[];
  }

  interface EditorTableRowNode {
    /** Enclosing row-level `w:sdt` content controls, outermost first. */
    sdtWrappers?: EditorSdtBlockWrapper[];
  }

  interface EditorTableCellNode {
    /** Enclosing cell-level `w:sdt` content controls, outermost first. */
    sdtWrappers?: EditorSdtBlockWrapper[];
  }
}

export {};
