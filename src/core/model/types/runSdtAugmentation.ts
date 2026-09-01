import type { EditorSdtBlockWrapper } from "./nodes.js";

declare module "./nodes.js" {
  interface EditorRunBase {
    /** Enclosing inline `w:sdt` content controls, outermost first. */
    sdtWrappers?: EditorSdtBlockWrapper[];
  }
}

export {};
