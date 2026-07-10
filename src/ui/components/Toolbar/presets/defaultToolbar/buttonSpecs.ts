import type { TranslationKey } from "@/i18n/index.js";

export const ALIGN_BUTTONS: Array<{
  command: string;
  icon: string;
  testId: string;
  tooltipKey:
    | "toolbar.alignLeft"
    | "toolbar.alignCenter"
    | "toolbar.alignRight"
    | "toolbar.justify";
}> = [
  {
    command: "alignLeft",
    icon: "align-left",
    testId: "editor-toolbar-align-left",
    tooltipKey: "toolbar.alignLeft",
  },
  {
    command: "alignCenter",
    icon: "align-center",
    testId: "editor-toolbar-align-center",
    tooltipKey: "toolbar.alignCenter",
  },
  {
    command: "alignRight",
    icon: "align-right",
    testId: "editor-toolbar-align-right",
    tooltipKey: "toolbar.alignRight",
  },
  {
    command: "alignJustify",
    icon: "align-justify",
    testId: "editor-toolbar-align-justify",
    tooltipKey: "toolbar.justify",
  },
];

export const LIST_BUTTONS: Array<{
  command: string;
  icon: string;
  testId: string;
  tooltipKey: "toolbar.bulletList" | "toolbar.numberedList";
}> = [
  {
    command: "bulletList",
    icon: "list",
    testId: "editor-toolbar-list-bullet",
    tooltipKey: "toolbar.bulletList",
  },
  {
    command: "orderedList",
    icon: "list-ordered",
    testId: "editor-toolbar-list-ordered",
    tooltipKey: "toolbar.numberedList",
  },
];

/** No-arg table commands surfaced as first-class buttons on the Table Layout tab. */
export const TABLE_LAYOUT_BUTTONS: Array<{
  id: string;
  command: string;
  icon: string;
  tooltipKey: TranslationKey;
  ribbonSize?: "large";
}> = [
  {
    id: "editor-toolbar-tbl-insert-row-above",
    command: "tableInsertRowBefore",
    icon: "tableInsertRowAbove",
    tooltipKey: "table.insertRowAbove",
    ribbonSize: "large",
  },
  {
    id: "editor-toolbar-tbl-insert-row-below",
    command: "tableInsertRowAfter",
    icon: "tableInsertRowBelow",
    tooltipKey: "table.insertRowBelow",
    ribbonSize: "large",
  },
  {
    id: "editor-toolbar-tbl-delete-row",
    command: "tableDeleteRow",
    icon: "tableDeleteRow",
    tooltipKey: "table.deleteRow",
  },
  {
    id: "editor-toolbar-tbl-insert-col-left",
    command: "tableInsertColumnBefore",
    icon: "tableInsertColumnLeft",
    tooltipKey: "table.insertColumnLeft",
    ribbonSize: "large",
  },
  {
    id: "editor-toolbar-tbl-insert-col-right",
    command: "tableInsertColumnAfter",
    icon: "tableInsertColumnRight",
    tooltipKey: "table.insertColumnRight",
    ribbonSize: "large",
  },
  {
    id: "editor-toolbar-tbl-delete-col",
    command: "tableDeleteColumn",
    icon: "tableDeleteColumn",
    tooltipKey: "table.deleteColumn",
  },
  {
    id: "editor-toolbar-tbl-merge",
    command: "tableMerge",
    icon: "tableMerge",
    tooltipKey: "table.mergeTooltip",
    ribbonSize: "large",
  },
  {
    id: "editor-toolbar-tbl-split",
    command: "tableSplit",
    icon: "tableSplit",
    tooltipKey: "table.splitTooltip",
  },
  {
    id: "editor-toolbar-tbl-width-100",
    command: "tableWidth100",
    icon: "tableWidth",
    tooltipKey: "table.width100Tooltip",
  },
  {
    id: "editor-toolbar-tbl-align-left",
    command: "tableAlignLeft",
    icon: "tableAlignLeft",
    tooltipKey: "table.alignLeft",
  },
  {
    id: "editor-toolbar-tbl-align-center",
    command: "tableAlignCenter",
    icon: "tableAlignCenter",
    tooltipKey: "table.alignCenter",
  },
  {
    id: "editor-toolbar-tbl-align-right",
    command: "tableAlignRight",
    icon: "tableAlignRight",
    tooltipKey: "table.alignRight",
  },
];

/** tblLook conditional-formatting toggles on the Table Design tab. */
export const TABLE_DESIGN_TOGGLES: Array<{
  id: string;
  command: string;
  labelKey: TranslationKey;
}> = [
  {
    id: "editor-toolbar-tbl-header-row",
    command: "tableToggleHeaderRow",
    labelKey: "table.headerRow",
  },
  {
    id: "editor-toolbar-tbl-total-row",
    command: "tableToggleTotalRow",
    labelKey: "table.totalRow",
  },
  {
    id: "editor-toolbar-tbl-banded-rows",
    command: "tableToggleBandedRows",
    labelKey: "table.bandedRows",
  },
  {
    id: "editor-toolbar-tbl-first-col",
    command: "tableToggleFirstColumn",
    labelKey: "table.firstColumn",
  },
  {
    id: "editor-toolbar-tbl-last-col",
    command: "tableToggleLastColumn",
    labelKey: "table.lastColumn",
  },
  {
    id: "editor-toolbar-tbl-banded-cols",
    command: "tableToggleBandedColumns",
    labelKey: "table.bandedColumns",
  },
];
