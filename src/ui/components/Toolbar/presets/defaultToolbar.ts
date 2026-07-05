import type { TranslateFn, TranslationKey } from "@/i18n/index.js";
import { STANDARD_FONT_SIZES_PT, fontSizePxToPt } from "@/ui/fontSizeUnits.js";
import type {
  RibbonRow,
  RibbonTabId,
  SelectOption,
  ToolbarActionApi,
  ToolbarDocumentStyle,
  ToolbarItem,
} from "@/ui/components/Toolbar/schema/items.js";
import { UnderlineControl } from "@/ui/components/Toolbar/controls/UnderlineControl.js";
import { ListOptionsControl } from "@/ui/components/Toolbar/controls/ListOptionsControl.js";
import { LineSpacingButton } from "@/ui/components/Toolbar/LineSpacingButton.js";
import { MetricGroup } from "@/ui/components/Toolbar/groups/MetricGroup.js";
import { SectionGroup } from "@/ui/components/Toolbar/groups/SectionGroup.js";
import { MarginsGroup } from "@/ui/components/Toolbar/groups/MarginsGroup.js";
import { ShapeGallery } from "@/ui/components/Toolbar/ShapeGallery.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Document's named styles, read through the uniform command-state channel. */
const documentStyles = (api: ToolbarActionApi): ToolbarDocumentStyle[] =>
  (api.commands.state("documentStyles").value as
    | ToolbarDocumentStyle[]
    | undefined) ?? [];

/** Named table styles for the Table Design gallery select. */
const tableStyleOptions = (api: ToolbarActionApi): SelectOption[] =>
  documentStyles(api)
    .filter((s) => s.type === "table")
    .map((s) => ({ value: s.id, label: s.name }));

const fontFamilyOptions = (api: ToolbarActionApi): SelectOption[] => {
  const values = new Set<string>([
    "Arial",
    "Calibri, sans-serif",
    "Calibri Light, sans-serif",
    "Georgia",
    "Inter",
    "Open Sans, sans-serif",
    "Times New Roman",
    "Courier New",
  ]);
  for (const s of documentStyles(api)) {
    if (s.fontFamily) values.add(s.fontFamily);
  }
  const current = String(
    api.commands.state("setFontFamily").value ?? "",
  ).trim();
  if (current) values.add(current);
  return Array.from(values)
    .sort((a, b) => a.localeCompare(b))
    .map((value) => ({ value, label: value }));
};

const fontSizeOptions = (api: ToolbarActionApi): SelectOption[] => {
  // Sizes are presented in points; document styles store pixels.
  const values = new Set<number>(STANDARD_FONT_SIZES_PT);
  for (const s of documentStyles(api)) {
    if (typeof s.fontSize === "number" && Number.isFinite(s.fontSize)) {
      values.add(fontSizePxToPt(s.fontSize));
    }
  }
  // The command state already reports the current size in points.
  const current = Number(api.commands.state("setFontSize").value);
  if (Number.isFinite(current) && current > 0) values.add(current);
  return Array.from(values)
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: String(n) }));
};

const ALIGN_BUTTONS: Array<{
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

const LIST_BUTTONS: Array<{
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
const TABLE_LAYOUT_BUTTONS: Array<{
  id: string;
  command: string;
  icon: string;
  tooltipKey: TranslationKey;
}> = [
  {
    id: "editor-toolbar-tbl-insert-row-above",
    command: "tableInsertRowBefore",
    icon: "rows",
    tooltipKey: "table.insertRowAbove",
  },
  {
    id: "editor-toolbar-tbl-insert-row-below",
    command: "tableInsertRowAfter",
    icon: "rows",
    tooltipKey: "table.insertRowBelow",
  },
  {
    id: "editor-toolbar-tbl-delete-row",
    command: "tableDeleteRow",
    icon: "trash-2",
    tooltipKey: "table.deleteRow",
  },
  {
    id: "editor-toolbar-tbl-insert-col-left",
    command: "tableInsertColumnBefore",
    icon: "columns",
    tooltipKey: "table.insertColumnLeft",
  },
  {
    id: "editor-toolbar-tbl-insert-col-right",
    command: "tableInsertColumnAfter",
    icon: "columns",
    tooltipKey: "table.insertColumnRight",
  },
  {
    id: "editor-toolbar-tbl-delete-col",
    command: "tableDeleteColumn",
    icon: "trash-2",
    tooltipKey: "table.deleteColumn",
  },
  {
    id: "editor-toolbar-tbl-merge",
    command: "tableMerge",
    icon: "combine",
    tooltipKey: "table.mergeTooltip",
  },
  {
    id: "editor-toolbar-tbl-split",
    command: "tableSplit",
    icon: "split",
    tooltipKey: "table.splitTooltip",
  },
  {
    id: "editor-toolbar-tbl-width-100",
    command: "tableWidth100",
    icon: "maximize",
    tooltipKey: "table.width100Tooltip",
  },
  {
    id: "editor-toolbar-tbl-align-left",
    command: "tableAlignLeft",
    icon: "align-left",
    tooltipKey: "table.alignLeft",
  },
  {
    id: "editor-toolbar-tbl-align-center",
    command: "tableAlignCenter",
    icon: "align-center",
    tooltipKey: "table.alignCenter",
  },
  {
    id: "editor-toolbar-tbl-align-right",
    command: "tableAlignRight",
    icon: "align-right",
    tooltipKey: "table.alignRight",
  },
];

/** tblLook conditional-formatting toggles on the Table Design tab. */
const TABLE_DESIGN_TOGGLES: Array<{
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

interface RibbonPlacement {
  tab: RibbonTabId;
  group: string;
  row: RibbonRow;
}

const RIBBON_PLACEMENTS: Record<string, RibbonPlacement> = {
  "editor-toolbar-file-dropdown": { tab: "file", group: "document", row: 1 },
  "sep-file": { tab: "file", group: "document", row: 1 },
  "editor-toolbar-undo": { tab: "home", group: "clipboard", row: 1 },
  "editor-toolbar-redo": { tab: "home", group: "clipboard", row: 2 },
  "sep-history": { tab: "home", group: "clipboard", row: 2 },
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
  "editor-toolbar-insert-table": { tab: "insert", group: "tables", row: 1 },
  "editor-toolbar-link": { tab: "insert", group: "links", row: 1 },
  "editor-toolbar-unlink": { tab: "insert", group: "links", row: 2 },
  "editor-toolbar-footnote": { tab: "references", group: "footnotes", row: 1 },
  "editor-toolbar-image-alt": { tab: "insert", group: "accessibility", row: 2 },
  "editor-toolbar-image-caption": {
    tab: "insert",
    group: "accessibility",
    row: 1,
  },
  "sep-insert": { tab: "insert", group: "accessibility", row: 2 },
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
  "editor-toolbar-tbl-header-row": {
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

function withDefaultRibbonPlacement(items: ToolbarItem[]): ToolbarItem[] {
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

/**
 * The built-in toolbar, expressed as data. Every item dispatches through the
 * command registry (the single source of truth) — the editor uses the same
 * public contribution API clients use. Load each item into a registry via
 * `registry.register` (see Toolbar bootstrap).
 */
export function createDefaultToolbarPreset(t: TranslateFn): ToolbarItem[] {
  const items: ToolbarItem[] = [];

  // --- File ---
  items.push({
    type: "menu",
    id: "editor-toolbar-file-dropdown",
    group: "file",
    iconName: "file",
    tooltipKey: "toolbar.file",
    content: {
      kind: "items",
      items: [
        {
          type: "button",
          id: "editor-toolbar-export-docx",
          testId: "editor-toolbar-export-docx",
          iconName: "file-text",
          labelKey: "toolbar.exportDocx",
          wide: true,
          tooltipKey: "toolbar.exportDocx",
          command: "exportDocx",
        },
        {
          type: "button",
          id: "editor-toolbar-export-pdf",
          testId: "editor-toolbar-export-pdf",
          iconName: "file-down",
          labelKey: "toolbar.exportPdf",
          wide: true,
          tooltipKey: "toolbar.exportPdf",
          command: "exportPdf",
        },
        {
          type: "button",
          id: "editor-toolbar-import-document",
          testId: "editor-toolbar-import-document",
          iconName: "upload",
          labelKey: "toolbar.import",
          wide: true,
          tooltipKey: "toolbar.import",
          command: "importDocument",
        },
      ],
    },
  });
  items.push({ type: "separator", id: "sep-file", group: "file" });

  // --- History ---
  items.push({
    type: "button",
    id: "editor-toolbar-undo",
    testId: "editor-toolbar-undo",
    iconName: "undo",
    command: "undo",
    tooltip: `${t("toolbar.undo")} (${mod}+Z)`,
  });
  items.push({
    type: "button",
    id: "editor-toolbar-redo",
    testId: "editor-toolbar-redo",
    iconName: "redo",
    command: "redo",
    tooltip: `${t("toolbar.redo")} (${mod}+Shift+Z)`,
  });
  items.push({ type: "separator", id: "sep-history" });

  // --- Style ---
  items.push({
    type: "styleGallery",
    id: "editor-toolbar-style",
    testId: "editor-toolbar-style",
    tooltipKey: "toolbar.style",
    ribbonSize: "large",
    styles: documentStyles,
    paragraphCommand: "setStyleId",
    characterCommand: "setCharacterStyleId",
  });
  items.push({
    type: "select",
    id: "editor-toolbar-font-family",
    testId: "editor-toolbar-font-family",
    tooltipKey: "toolbar.fontFamily",
    placeholder: t("toolbar.font"),
    command: "setFontFamily",
    options: fontFamilyOptions,
  });
  items.push({
    type: "select",
    id: "editor-toolbar-font-size",
    testId: "editor-toolbar-font-size",
    width: "small",
    tooltipKey: "toolbar.fontSize",
    command: "setFontSize",
    options: fontSizeOptions,
  });
  items.push({
    type: "button",
    id: "editor-toolbar-font-increase",
    testId: "editor-toolbar-font-increase",
    iconName: "a-arrow-up",
    command: "increaseFontSize",
    tooltipKey: "toolbar.increaseFontSize",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-font-decrease",
    testId: "editor-toolbar-font-decrease",
    iconName: "a-arrow-down",
    command: "decreaseFontSize",
    tooltipKey: "toolbar.decreaseFontSize",
  });
  items.push({
    type: "menu",
    id: "editor-toolbar-change-case",
    testId: "editor-toolbar-change-case",
    iconName: "case-sensitive",
    tooltipKey: "toolbar.changeCase",
    isDisabled: (api) =>
      !api.commands.state({ name: "changeTextCase" }).isEnabled,
    content: {
      kind: "items",
      items: [
        {
          type: "button",
          id: "editor-toolbar-case-sentence",
          testId: "editor-toolbar-case-sentence",
          labelKey: "toolbar.caseSentence",
          wide: true,
          tooltipKey: "toolbar.caseSentence",
          command: { name: "changeTextCase", payload: "sentence" },
        },
        {
          type: "button",
          id: "editor-toolbar-case-lower",
          testId: "editor-toolbar-case-lower",
          labelKey: "toolbar.caseLower",
          wide: true,
          tooltipKey: "toolbar.caseLower",
          command: { name: "changeTextCase", payload: "lower" },
        },
        {
          type: "button",
          id: "editor-toolbar-case-upper",
          testId: "editor-toolbar-case-upper",
          labelKey: "toolbar.caseUpper",
          wide: true,
          tooltipKey: "toolbar.caseUpper",
          command: { name: "changeTextCase", payload: "upper" },
        },
        {
          type: "button",
          id: "editor-toolbar-case-capitalize",
          testId: "editor-toolbar-case-capitalize",
          labelKey: "toolbar.caseCapitalize",
          wide: true,
          tooltipKey: "toolbar.caseCapitalize",
          command: { name: "changeTextCase", payload: "capitalize" },
        },
        {
          type: "button",
          id: "editor-toolbar-case-toggle",
          testId: "editor-toolbar-case-toggle",
          labelKey: "toolbar.caseToggle",
          wide: true,
          tooltipKey: "toolbar.caseToggle",
          command: { name: "changeTextCase", payload: "toggle" },
        },
      ],
    },
  });
  items.push({
    type: "button",
    id: "editor-toolbar-clear-formatting",
    testId: "editor-toolbar-clear-formatting",
    iconName: "remove-formatting",
    command: "clearFormatting",
    tooltipKey: "toolbar.clearFormatting",
  });

  // --- Font formatting ---
  items.push({
    type: "toggle",
    id: "editor-toolbar-bold",
    testId: "editor-toolbar-bold",
    iconName: "bold",
    command: "bold",
    tooltipKey: "toolbar.bold",
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-italic",
    testId: "editor-toolbar-italic",
    iconName: "italic",
    command: "italic",
    tooltipKey: "toolbar.italic",
  });
  items.push({
    type: "custom",
    id: "editor-toolbar-underline-control",
    render: (api) => UnderlineControl({ api }),
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-strike",
    testId: "editor-toolbar-strike",
    iconName: "strikethrough",
    command: "strike",
    tooltipKey: "toolbar.strike",
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-subscript",
    testId: "editor-toolbar-subscript",
    iconName: "subscript",
    command: "subscript",
    tooltipKey: "toolbar.subscript",
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-superscript",
    testId: "editor-toolbar-superscript",
    iconName: "superscript",
    command: "superscript",
    tooltipKey: "toolbar.superscript",
  });
  items.push({ type: "separator", id: "sep-format" });
  items.push({
    type: "colorPicker",
    id: "editor-toolbar-color",
    testId: "editor-toolbar-color",
    kind: "color",
    iconName: "type",
    defaultValue: "#111827",
    tooltipKey: "toolbar.color",
    command: "setColor",
  });
  items.push({
    type: "colorPicker",
    id: "editor-toolbar-highlight",
    testId: "editor-toolbar-highlight",
    kind: "highlight",
    iconName: "highlighter",
    defaultValue: "#fef08a",
    tooltipKey: "toolbar.highlight",
    command: "setHighlight",
  });
  items.push({
    type: "colorPicker",
    id: "editor-toolbar-text-shading",
    testId: "editor-toolbar-text-shading",
    kind: "shading",
    iconName: "paint-bucket",
    defaultValue: "#fef3c7",
    tooltipKey: "toolbar.textShading",
    command: "setTextShading",
  });
  items.push({ type: "separator", id: "sep-style" });

  // --- Insert ---
  items.push({
    type: "button",
    id: "editor-toolbar-insert-image",
    testId: "editor-toolbar-insert-image",
    iconName: "image",
    tooltipKey: "toolbar.image",
    labelKey: "toolbar.image",
    ribbonSize: "large",
    command: "insertImage",
  });
  items.push({
    type: "menu",
    id: "editor-toolbar-insert-shape",
    testId: "editor-toolbar-insert-shape",
    iconName: "shapes",
    tooltipKey: "toolbar.shapes",
    labelKey: "toolbar.shapes",
    ribbonSize: "large",
    panelClass: "oasis-editor-shape-gallery-panel",
    content: {
      kind: "custom",
      render: (api) => ShapeGallery({ api }),
    },
  });
  items.push({
    type: "gridPicker",
    id: "editor-toolbar-insert-table",
    testId: "editor-toolbar-insert-table",
    tooltipKey: "toolbar.table",
    labelKey: "toolbar.table",
    ribbonSize: "large",
    command: "insertTable",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-link",
    testId: "editor-toolbar-link",
    iconName: "link",
    command: "link",
    tooltip: `${t("toolbar.link")} (${mod}+K)`,
    labelKey: "toolbar.link",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-unlink",
    testId: "editor-toolbar-unlink",
    iconName: "unlink",
    command: "unlink",
    tooltipKey: "toolbar.unlink",
    labelKey: "toolbar.unlink",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-footnote",
    testId: "editor-toolbar-footnote",
    iconName: "footnote",
    command: "insertFootnote",
    tooltip: `${t("toolbar.footnote")} (${mod}+Alt+F)`,
    labelKey: "toolbar.footnote",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-image-alt",
    testId: "editor-toolbar-image-alt",
    iconName: "file-text",
    tooltipKey: "toolbar.alt",
    labelKey: "toolbar.alt",
    ribbonSize: "large",
    command: "editImageAlt",
    isVisible: (api) => api.commands.state("editImageAlt").isEnabled,
  });
  items.push({
    type: "button",
    id: "editor-toolbar-image-caption",
    testId: "editor-toolbar-image-caption",
    iconName: "subtitles",
    tooltipKey: "toolbar.imageCaption",
    labelKey: "toolbar.imageCaption",
    ribbonSize: "large",
    command: "insertImageCaption",
    isVisible: (api) => api.commands.state("insertImageCaption").isEnabled,
  });
  items.push({ type: "separator", id: "sep-insert" });

  // --- Paragraph ---
  for (const button of ALIGN_BUTTONS) {
    items.push({
      type: "toggle",
      id: button.testId,
      testId: button.testId,
      iconName: button.icon,
      command: button.command,
      tooltipKey: button.tooltipKey,
    });
  }
  for (const button of LIST_BUTTONS) {
    items.push({
      type: "toggle",
      id: button.testId,
      testId: button.testId,
      iconName: button.icon,
      command: button.command,
      tooltipKey: button.tooltipKey,
    });
  }
  items.push({
    type: "button",
    id: "editor-toolbar-list-outdent",
    testId: "editor-toolbar-list-outdent",
    iconName: "indent-decrease",
    tooltipKey: "toolbar.decreaseIndent",
    command: "outdent",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-list-indent",
    testId: "editor-toolbar-list-indent",
    iconName: "indent-increase",
    tooltipKey: "toolbar.increaseIndent",
    command: "indent",
  });
  items.push({
    type: "custom",
    id: "editor-toolbar-list-options",
    render: (api) => ListOptionsControl({ api }),
  });
  items.push({
    type: "split",
    id: "editor-toolbar-special-indent",
    testId: "editor-toolbar-special-indent",
    iconName: "specialIndentFirstLine",
    tooltipKey: "toolbar.specialIndent",
    command: { name: "setSpecialIndent", payload: { kind: "firstLine" } },
    isActive: () => false,
    panelClass:
      "oasis-editor-toolbar-dropdown-menu oasis-editor-special-indent-menu",
    menu: {
      kind: "items",
      items: [
        {
          type: "button",
          id: "editor-toolbar-special-indent-none",
          testId: "editor-toolbar-special-indent-none",
          iconName: "minus",
          labelKey: "toolbar.specialIndentNone",
          tooltipKey: "toolbar.specialIndentNone",
          command: { name: "setSpecialIndent", payload: { kind: "none" } },
          wide: true,
        },
        {
          type: "button",
          id: "editor-toolbar-special-indent-first-line",
          testId: "editor-toolbar-special-indent-first-line",
          iconName: "list-collapse",
          labelKey: "toolbar.specialIndentFirstLine",
          tooltipKey: "toolbar.specialIndentFirstLine",
          command: {
            name: "setSpecialIndent",
            payload: { kind: "firstLine" },
          },
          wide: true,
        },
        {
          type: "button",
          id: "editor-toolbar-special-indent-hanging",
          testId: "editor-toolbar-special-indent-hanging",
          iconName: "list-indent-increase",
          labelKey: "toolbar.specialIndentHanging",
          tooltipKey: "toolbar.specialIndentHanging",
          command: { name: "setSpecialIndent", payload: { kind: "hanging" } },
          wide: true,
        },
      ],
    },
  });

  // --- Line spacing ---
  items.push({
    type: "custom",
    id: "editor-toolbar-line-spacing-control",
    render: (api) => LineSpacingButton({ api }),
  });
  items.push({ type: "separator", id: "sep-paragraph" });

  // --- Metrics ---
  items.push({
    type: "custom",
    id: "editor-toolbar-metrics",
    ribbonSize: "large",
    render: (api) => MetricGroup({ api }),
  });
  items.push({ type: "separator", id: "sep-metrics" });

  // --- Table Layout (contextual tab) ---
  // First-class ribbon buttons for the existing no-arg table commands. The
  // whole tab is shown only inside a table (see CONTEXTUAL_TABS); each button
  // additionally derives its enabled state from its command.
  for (const spec of TABLE_LAYOUT_BUTTONS) {
    items.push({
      type: "button",
      id: spec.id,
      testId: spec.id,
      iconName: spec.icon,
      command: spec.command,
      tooltipKey: spec.tooltipKey,
      labelKey: spec.tooltipKey,
      ribbonSize: "large",
    });
  }

  // --- Table Design (contextual tab) ---
  // Table Style Options: tblLook conditional-formatting toggles.
  for (const spec of TABLE_DESIGN_TOGGLES) {
    items.push({
      type: "toggle",
      id: spec.id,
      testId: spec.id,
      command: spec.command,
      labelKey: spec.labelKey,
      tooltipKey: spec.labelKey,
      ribbonSize: "large",
    });
  }
  // Borders: shading (a real color picker, not a prompt) + border presets.
  items.push({
    type: "colorPicker",
    id: "editor-toolbar-tbl-shading",
    testId: "editor-toolbar-tbl-shading",
    kind: "shading",
    command: "tableCellShading",
    defaultValue: "#f1f5f9",
    tooltipKey: "table.cellColor",
    labelKey: "table.cellColor",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-tbl-borders",
    testId: "editor-toolbar-tbl-borders",
    iconName: "frame",
    command: "tableCellBorders",
    tooltipKey: "table.applyBorders",
    labelKey: "table.applyBorders",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-tbl-no-borders",
    testId: "editor-toolbar-tbl-no-borders",
    iconName: "square",
    command: "tableCellNoBorders",
    tooltipKey: "table.removeBorders",
    labelKey: "table.removeBorders",
    ribbonSize: "large",
  });
  // Table Styles: apply a named table style (the document's table-style gallery).
  items.push({
    type: "select",
    id: "editor-toolbar-tbl-style",
    testId: "editor-toolbar-tbl-style",
    tooltipKey: "table.tableStyle",
    labelKey: "table.tableStyle",
    ribbonSize: "large",
    placeholder: t("table.tableStyle"),
    width: "wide",
    command: "setTableStyle",
    options: tableStyleOptions,
  });
  // Cell Size group on the Layout tab: distribute + AutoFit.
  items.push({
    type: "button",
    id: "editor-toolbar-tbl-distribute-rows",
    testId: "editor-toolbar-tbl-distribute-rows",
    iconName: "rows",
    command: "tableDistributeRows",
    tooltipKey: "table.distributeRows",
    labelKey: "table.distributeRows",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-tbl-distribute-cols",
    testId: "editor-toolbar-tbl-distribute-cols",
    iconName: "columns",
    command: "tableDistributeColumns",
    tooltipKey: "table.distributeColumns",
    labelKey: "table.distributeColumns",
    ribbonSize: "large",
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-tbl-autofit",
    testId: "editor-toolbar-tbl-autofit",
    iconName: "move-horizontal",
    command: "tableToggleAutoFit",
    labelKey: "table.autoFit",
    tooltipKey: "table.autoFit",
    ribbonSize: "large",
  });

  // --- Section ---
  items.push({
    type: "custom",
    id: "editor-toolbar-margins",
    ribbonSize: "large",
    render: (api) => MarginsGroup({ api }),
  });
  items.push({
    type: "custom",
    id: "editor-toolbar-section",
    ribbonSize: "large",
    render: (api) => SectionGroup({ api }),
  });

  return withDefaultRibbonPlacement(items);
}
