import type { QuickAccessCatalogEntry } from "./createQuickAccess.js";
import type { TranslationKey } from "@/i18n/index.js";

export interface QuickAccessCatalogItem extends QuickAccessCatalogEntry {
  labelKey: TranslationKey;
  /** Optional shortcut hint shown in the customize menu. */
  shortcut?: string;
}

/** Curated command surface for the strip; translation handled at render. */
export const QUICK_ACCESS_CATALOG: readonly QuickAccessCatalogItem[] = [
  { command: "saveDocument", icon: "save", labelKey: "generic.save" },
  {
    command: "undo",
    icon: "undo",
    labelKey: "toolbar.undo",
    shortcut: "Ctrl+Z",
  },
  {
    command: "redo",
    icon: "redo",
    labelKey: "toolbar.redo",
    shortcut: "Ctrl+Y",
  },
  {
    command: "find",
    icon: "search",
    labelKey: "find.title",
    shortcut: "Ctrl+F",
  },
  {
    command: "print",
    icon: "printer",
    labelKey: "menu.file.print",
    shortcut: "Ctrl+P",
  },
  { command: "exportDocx", icon: "file-text", labelKey: "toolbar.exportDocx" },
  { command: "exportPdf", icon: "file-down", labelKey: "toolbar.exportPdf" },
  {
    command: "toggleTrackChanges",
    icon: "file-check",
    labelKey: "toolbar.trackChanges",
  },
  {
    command: "toggleRevisionMarkup",
    icon: "highlighter",
    labelKey: "toolbar.revisionMarkup",
  },
  {
    command: "toggleCommentsPanel",
    icon: "list-filter",
    labelKey: "review.commentsPanel",
  },
  {
    command: "toggleRevisionsPanel",
    icon: "list-checks",
    labelKey: "toolbar.revisionsPanel",
  },
  {
    command: "toggleOutlinePanel",
    icon: "list",
    labelKey: "menu.view.outline",
  },
  {
    command: "togglePreciseFonts",
    icon: "type",
    labelKey: "menu.view.preciseFonts",
  },
  {
    command: "toggleShowParagraphMarks",
    icon: "pilcrow",
    labelKey: "menu.view.paragraphMarks",
  },
  { command: "toggleShowMargins", icon: "scan", labelKey: "menu.view.margins" },
] as const;
