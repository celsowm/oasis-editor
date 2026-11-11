import type {
  RibbonRow,
  RibbonTabId,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";

interface RibbonPlacement {
  tab: RibbonTabId;
  group: string;
  row: RibbonRow;
}

const RIBBON_PLACEMENTS: Record<string, RibbonPlacement> = {
  "editor-toolbar-paste": { tab: "home", group: "clipboard", row: 1 },
  "editor-toolbar-copy": { tab: "home", group: "clipboard", row: 2 },
  "editor-toolbar-cut": { tab: "home", group: "clipboard", row: 1 },
  "editor-toolbar-format-painter": { tab: "home", group: "clipboard", row: 3 },
  "editor-toolbar-find": { tab: "home", group: "editing", row: 1 },
  "editor-toolbar-select-all": { tab: "home", group: "editing", row: 2 },
  "editor-toolbar-page-break": { tab: "insert", group: "pages", row: 1 },
  "editor-toolbar-insert-toc": {
    tab: "references",
    group: "tableOfContents",
    row: 1,
  },
  "editor-toolbar-update-toc": {
    tab: "references",
    group: "tableOfContents",
    row: 2,
  },
  "editor-toolbar-track-changes": { tab: "review", group: "tracking", row: 1 },
  "editor-toolbar-accept-revisions": {
    tab: "review",
    group: "changes",
    row: 1,
  },
  "editor-toolbar-reject-revisions": {
    tab: "review",
    group: "changes",
    row: 2,
  },
  "editor-toolbar-previous-revision": {
    tab: "review",
    group: "changes",
    row: 1,
  },
  "editor-toolbar-next-revision": { tab: "review", group: "changes", row: 2 },
  "editor-toolbar-comments-panel": { tab: "review", group: "comments", row: 1 },
  "editor-toolbar-new-comment": { tab: "review", group: "comments", row: 1 },
  "editor-toolbar-reply-comment": { tab: "review", group: "comments", row: 2 },
  "editor-toolbar-edit-comment": { tab: "review", group: "comments", row: 1 },
  "editor-toolbar-previous-comment": {
    tab: "review",
    group: "comments",
    row: 1,
  },
  "editor-toolbar-next-comment": { tab: "review", group: "comments", row: 2 },
  "editor-toolbar-resolve-comment": {
    tab: "review",
    group: "comments",
    row: 1,
  },
  "editor-toolbar-reopen-comment": { tab: "review", group: "comments", row: 2 },
  "editor-toolbar-delete-comment": { tab: "review", group: "comments", row: 2 },
  "editor-toolbar-show-margins": { tab: "view", group: "show", row: 1 },
  "editor-toolbar-show-paragraph-marks": { tab: "view", group: "show", row: 1 },
  "editor-toolbar-precise-fonts": { tab: "view", group: "show", row: 2 },
  "editor-toolbar-save-document": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-new-document": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-export-docx": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-export-pdf": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-print": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-import-document": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-undo": { tab: "home", group: "history", row: 1 },
  "editor-toolbar-redo": { tab: "home", group: "history", row: 2 },
  "sep-history": { tab: "home", group: "history", row: 2 },
  "editor-toolbar-style": { tab: "home", group: "styles", row: 1 },
  "editor-toolbar-font-family": { tab: "home", group: "font", row: 1 },
  "editor-toolbar-font-size": { tab: "home", group: "font", row: 1 },
  "editor-toolbar-font-increase": { tab: "home", group: "font", row: 1 },
  "editor-toolbar-font-decrease": { tab: "home", group: "font", row: 1 },
  "editor-toolbar-change-case": { tab: "home", group: "font", row: 1 },
  "editor-toolbar-clear-formatting": { tab: "home", group: "font", row: 1 },
  "editor-toolbar-color": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-highlight": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-text-shading": { tab: "home", group: "font", row: 2 },
  "sep-style": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-bold": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-italic": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-underline-control": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-strike": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-superscript": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-subscript": { tab: "home", group: "font", row: 2 },
  "sep-format": { tab: "home", group: "font", row: 2 },
  "editor-toolbar-insert-image": {
    tab: "insert",
    group: "illustrations",
    row: 1,
  },
  "editor-toolbar-insert-shape": {
    tab: "insert",
    group: "illustrations",
    row: 2,
  },
  "editor-toolbar-symbols": { tab: "insert", group: "symbols", row: 1 },
  "editor-toolbar-insert-table": { tab: "insert", group: "tables", row: 1 },
  "editor-toolbar-link": { tab: "insert", group: "links", row: 1 },
  "editor-toolbar-unlink": { tab: "insert", group: "links", row: 2 },
  "editor-toolbar-insert-bookmark": {
    tab: "insert",
    group: "links",
    row: 1,
  },
  "editor-toolbar-insert-date": { tab: "insert", group: "links", row: 1 },
  "editor-toolbar-footnote": { tab: "references", group: "footnotes", row: 1 },
  "editor-toolbar-header-footer": {
    tab: "insert",
    group: "headerFooter",
    row: 1,
  },
  "editor-toolbar-image-alt": { tab: "insert", group: "accessibility", row: 2 },
  "editor-toolbar-image-caption": {
    tab: "insert",
    group: "accessibility",
    row: 1,
  },
  "sep-insert": { tab: "insert", group: "accessibility", row: 2 },
  "editor-toolbar-image-crop": { tab: "imageFormat", group: "size", row: 1 },
  "editor-toolbar-image-height": { tab: "imageFormat", group: "size", row: 1 },
  "editor-toolbar-image-width": { tab: "imageFormat", group: "size", row: 2 },
  "editor-toolbar-image-border": {
    tab: "imageFormat",
    group: "imageStyles",
    row: 1,
  },
  "editor-toolbar-align-left": { tab: "home", group: "paragraph", row: 2 },
  "editor-toolbar-align-center": { tab: "home", group: "paragraph", row: 2 },
  "editor-toolbar-align-right": { tab: "home", group: "paragraph", row: 2 },
  "editor-toolbar-align-justify": { tab: "home", group: "paragraph", row: 2 },
  "editor-toolbar-list-bullet": { tab: "home", group: "paragraph", row: 1 },
  "editor-toolbar-list-ordered": { tab: "home", group: "paragraph", row: 1 },
  "editor-toolbar-list-outdent": { tab: "home", group: "paragraph", row: 1 },
  "editor-toolbar-list-indent": { tab: "home", group: "paragraph", row: 1 },
  "editor-toolbar-list-options": { tab: "home", group: "paragraph", row: 1 },
  "editor-toolbar-special-indent": {
    tab: "home",
    group: "paragraph",
    row: 1,
  },
  "editor-toolbar-line-spacing-control": {
    tab: "home",
    group: "paragraph",
    row: 2,
  },
  "sep-paragraph": { tab: "home", group: "paragraph", row: 2 },
  "editor-toolbar-metrics": { tab: "layout", group: "paragraph", row: 1 },
  "sep-metrics": { tab: "layout", group: "paragraph", row: 2 },
  "editor-toolbar-tbl-insert-row-above": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 1,
  },
  "editor-toolbar-tbl-insert-row-below": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 1,
  },
  "editor-toolbar-tbl-delete-row": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 1,
  },
  "editor-toolbar-tbl-border-painter": {
    tab: "tableDesign",
    group: "borders",
    row: 2,
  },
  "editor-toolbar-tbl-insert-col-left": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 2,
  },
  "editor-toolbar-tbl-insert-col-right": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 2,
  },
  "editor-toolbar-tbl-delete-col": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 2,
  },
  "editor-toolbar-tbl-merge": { tab: "tableLayout", group: "merge", row: 1 },
  "editor-toolbar-tbl-split": { tab: "tableLayout", group: "merge", row: 2 },
  "editor-toolbar-tbl-to-text": {
    tab: "tableLayout",
    group: "merge",
    row: 2,
  },
  "editor-toolbar-tbl-text-to-table": {
    tab: "tableLayout",
    group: "merge",
    row: 2,
  },
  "editor-toolbar-tbl-split-table": {
    tab: "tableLayout",
    group: "merge",
    row: 2,
  },
  "editor-toolbar-tbl-sort-asc": {
    tab: "tableLayout",
    group: "sort",
    row: 1,
  },
  "editor-toolbar-tbl-sort-desc": {
    tab: "tableLayout",
    group: "sort",
    row: 1,
  },
  "editor-toolbar-tbl-delete-table": {
    tab: "tableLayout",
    group: "rowsColumns",
    row: 2,
  },
  "editor-toolbar-tbl-repeat-header": {
    tab: "tableLayout",
    group: "merge",
    row: 1,
  },
  "editor-toolbar-tbl-width-100": {
    tab: "tableLayout",
    group: "cellSize",
    row: 1,
  },
  "editor-toolbar-tbl-align-left": {
    tab: "tableLayout",
    group: "alignment",
    row: 1,
  },
  "editor-toolbar-tbl-align-center": {
    tab: "tableLayout",
    group: "alignment",
    row: 1,
  },
  "editor-toolbar-tbl-align-right": {
    tab: "tableLayout",
    group: "alignment",
    row: 1,
  },
  "editor-toolbar-tbl-valign-top": {
    tab: "tableLayout",
    group: "alignment",
    row: 2,
  },
  "editor-toolbar-tbl-valign-middle": {
    tab: "tableLayout",
    group: "alignment",
    row: 2,
  },
  "editor-toolbar-tbl-valign-bottom": {
    tab: "tableLayout",
    group: "alignment",
    row: 2,
  },
  "editor-toolbar-cell-alignment-matrix": {
    tab: "tableLayout",
    group: "alignment",
    row: 1,
  },
  "editor-toolbar-tbl-header-row": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 1,
  },
  "editor-toolbar-tbl-style-options": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 1,
  },
  "editor-toolbar-tbl-total-row": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 1,
  },
  "editor-toolbar-tbl-banded-rows": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 1,
  },
  "editor-toolbar-tbl-first-col": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 2,
  },
  "editor-toolbar-tbl-last-col": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 2,
  },
  "editor-toolbar-tbl-banded-cols": {
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 2,
  },
  "editor-toolbar-tbl-shading": {
    tab: "tableDesign",
    group: "borders",
    row: 1,
  },
  "editor-toolbar-tbl-borders": {
    tab: "tableDesign",
    group: "borders",
    row: 2,
  },
  "editor-toolbar-tbl-no-borders": {
    tab: "tableDesign",
    group: "borders",
    row: 2,
  },
  "editor-toolbar-tbl-style": {
    tab: "tableDesign",
    group: "tableStyles",
    row: 1,
  },
  "editor-toolbar-tbl-distribute-rows": {
    tab: "tableLayout",
    group: "cellSize",
    row: 1,
  },
  "editor-toolbar-tbl-distribute-cols": {
    tab: "tableLayout",
    group: "cellSize",
    row: 1,
  },
  "editor-toolbar-tbl-autofit": {
    tab: "tableLayout",
    group: "cellSize",
    row: 2,
  },
  "editor-toolbar-margins": { tab: "layout", group: "section", row: 1 },
  "editor-toolbar-section": { tab: "layout", group: "section", row: 1 },
};

export function withDefaultRibbonPlacement(
  items: ToolbarItem[],
): ToolbarItem[] {
  return items.map((item, index) => {
    const placement = RIBBON_PLACEMENTS[item.id] ?? {
      tab: "plugins" as const,
      group: item.group ?? "general",
      row: 1 as const,
    };
    return {
      ...item,
      tab: item.tab ?? placement.tab,
      group: placement.group,
      row: item.row ?? placement.row,
      order: item.order ?? index,
    };
  });
}
