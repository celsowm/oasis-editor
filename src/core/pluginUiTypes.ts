// Neutral UI-contribution vocabulary owned by the core. These describe *where*
// a plugin contribution lands in a ribbon-style toolbar without depending on any
// concrete toolbar implementation, keeping the core free of `src/ui` imports
// (DIP). The toolbar layer re-exports these from its schema for convenience, but
// they are defined here so `core/plugin.ts` can stay UI-agnostic.

export const RIBBON_TABS = [
  "file",
  "home",
  "insert",
  "draw",
  "layout",
  "references",
  "collaboration",
  "protection",
  "view",
  "tableDesign",
  "tableLayout",
  "imageFormat",
  "plugins",
  "ai",
] as const;

export type RibbonTabId = (typeof RIBBON_TABS)[number];

/**
 * Contextual tabs are hidden from the tab strip unless their gating command
 * reports `isActive`. This mirrors Word's contextual ribbons (e.g. table tools
 * that appear only when the caret is inside a table). The mapping is
 * UI-agnostic: the value is the command id whose `isActive` state gates the tab.
 */
export const CONTEXTUAL_TABS: Partial<Record<RibbonTabId, string>> = {
  tableDesign: "tableContext",
  tableLayout: "tableContext",
  imageFormat: "imageContext",
};
export type RibbonRow = 1 | 2;
export type RibbonSize = "normal" | "large";
export type RibbonGroupResizeState = "full" | "compact" | "collapsed";

export interface RibbonGroupResizePolicy {
  states?: RibbonGroupResizeState[];
  priority?: number;
  compactMinWidth?: number;
  collapsedMinWidth?: number;
  collapsedIcon?: string;
  compactLabels?: "show" | "hide";
}
