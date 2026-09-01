import type { EditorSdtBlockWrapper } from "./nodes.js";

declare module "./primitives.js" {
  interface EditorRevision {
    /** Word tracked-move semantics layered over delete/insert revisions. */
    move?: "from" | "to";
  }
}

declare module "./nodes.js" {
  interface EditorRunBase {
    /** Enclosing inline `w:sdt` content controls, outermost first. */
    sdtWrappers?: EditorSdtBlockWrapper[];
    /**
     * Zero-length Word move-container boundary (`moveFrom/ToRangeStart/End`).
     * Start markers carry CT_MoveBookmark metadata; end markers retain the
     * matching id and optional custom-XML displacement hint.
     */
    revisionRangeMarker?: {
      move: "from" | "to";
      edge: "start" | "end";
      id: string;
      name?: string;
      author?: string;
      date?: number;
      columnFirst?: number;
      columnLast?: number;
      displacedByCustomXml?: string;
    };
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
