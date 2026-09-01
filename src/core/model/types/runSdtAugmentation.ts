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

  interface EditorSdtPr {
    /** Word 2013 `w15:repeatingSection` settings. */
    repeatingSectionProperties?: {
      /** `w15:sectionTitle/@w15:val`. */
      sectionTitle?: string;
      /** Presence/value of `w15:doNotAllowInsertDeleteSection`. */
      doNotAllowInsertDeleteSection?: boolean;
    };
  }
}

export {};
