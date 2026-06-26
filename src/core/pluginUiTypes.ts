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
  "plugins",
  "ai",
] as const;

export type RibbonTabId = (typeof RIBBON_TABS)[number];
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
