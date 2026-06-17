import { t } from "@/i18n/index.js";
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
import { TableGroup } from "@/ui/components/Toolbar/groups/TableGroup.js";
import { SectionGroup } from "@/ui/components/Toolbar/groups/SectionGroup.js";
import { MarginsGroup } from "@/ui/components/Toolbar/groups/MarginsGroup.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Document's named styles, read through the uniform command-state channel. */
const documentStyles = (api: ToolbarActionApi): ToolbarDocumentStyle[] =>
  (api.commands.state("documentStyles").value as
    | ToolbarDocumentStyle[]
    | undefined) ?? [];

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

const styleOptions = (api: ToolbarActionApi): SelectOption[] =>
  documentStyles(api).map((s) => ({ value: s.id, label: s.name }));

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
  "editor-toolbar-table": { tab: "layout", group: "table", row: 1 },
  "sep-table": { tab: "layout", group: "table", row: 2 },
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
export function createDefaultToolbarPreset(): ToolbarItem[] {
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
    type: "select",
    id: "editor-toolbar-style",
    testId: "editor-toolbar-style",
    width: "wide",
    tooltipKey: "toolbar.style",
    command: "setStyleId",
    options: styleOptions,
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
    command: "insertImage",
  });
  items.push({
    type: "menu",
    id: "editor-toolbar-insert-shape",
    testId: "editor-toolbar-insert-shape",
    iconName: "shapes",
    tooltipKey: "toolbar.shapes",
    content: {
      kind: "items",
      items: [
        {
          type: "button",
          id: "editor-toolbar-shape-rect",
          testId: "editor-toolbar-shape-rect",
          labelKey: "toolbar.shape.rect",
          wide: true,
          tooltipKey: "toolbar.shape.rect",
          command: { name: "insertShape", payload: "rect" },
        },
        {
          type: "button",
          id: "editor-toolbar-shape-roundRect",
          testId: "editor-toolbar-shape-roundRect",
          labelKey: "toolbar.shape.roundRect",
          wide: true,
          tooltipKey: "toolbar.shape.roundRect",
          command: { name: "insertShape", payload: "roundRect" },
        },
        {
          type: "button",
          id: "editor-toolbar-shape-ellipse",
          testId: "editor-toolbar-shape-ellipse",
          labelKey: "toolbar.shape.ellipse",
          wide: true,
          tooltipKey: "toolbar.shape.ellipse",
          command: { name: "insertShape", payload: "ellipse" },
        },
        {
          type: "button",
          id: "editor-toolbar-shape-triangle",
          testId: "editor-toolbar-shape-triangle",
          labelKey: "toolbar.shape.triangle",
          wide: true,
          tooltipKey: "toolbar.shape.triangle",
          command: { name: "insertShape", payload: "triangle" },
        },
        {
          type: "button",
          id: "editor-toolbar-shape-rtTriangle",
          testId: "editor-toolbar-shape-rtTriangle",
          labelKey: "toolbar.shape.rtTriangle",
          wide: true,
          tooltipKey: "toolbar.shape.rtTriangle",
          command: { name: "insertShape", payload: "rtTriangle" },
        },
        {
          type: "button",
          id: "editor-toolbar-shape-diamond",
          testId: "editor-toolbar-shape-diamond",
          labelKey: "toolbar.shape.diamond",
          wide: true,
          tooltipKey: "toolbar.shape.diamond",
          command: { name: "insertShape", payload: "diamond" },
        },
      ],
    },
  });
  items.push({
    type: "gridPicker",
    id: "editor-toolbar-insert-table",
    testId: "editor-toolbar-insert-table",
    tooltipKey: "toolbar.table",
    command: "insertTable",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-link",
    testId: "editor-toolbar-link",
    iconName: "link",
    command: "link",
    tooltip: `${t("toolbar.link")} (${mod}+K)`,
  });
  items.push({
    type: "button",
    id: "editor-toolbar-unlink",
    testId: "editor-toolbar-unlink",
    iconName: "unlink",
    command: "unlink",
    tooltipKey: "toolbar.unlink",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-footnote",
    testId: "editor-toolbar-footnote",
    iconName: "footnote",
    command: "insertFootnote",
    tooltip: `${t("toolbar.footnote")} (${mod}+Alt+F)`,
  });
  items.push({
    type: "button",
    id: "editor-toolbar-image-alt",
    testId: "editor-toolbar-image-alt",
    iconName: "file-text",
    tooltipKey: "toolbar.alt",
    command: "editImageAlt",
    isVisible: (api) => api.commands.state("editImageAlt").isEnabled,
  });
  items.push({
    type: "button",
    id: "editor-toolbar-image-caption",
    testId: "editor-toolbar-image-caption",
    iconName: "subtitles",
    tooltipKey: "toolbar.imageCaption",
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
    render: (api) => MetricGroup({ api }),
  });
  items.push({ type: "separator", id: "sep-metrics" });

  // --- Table (contextual) ---
  items.push({
    type: "custom",
    id: "editor-toolbar-table",
    isVisible: (api) => api.commands.state("tableContext").isActive,
    render: (api) => TableGroup({ api }),
  });
  items.push({
    type: "separator",
    id: "sep-table",
    isVisible: (api) => api.commands.state("tableContext").isActive,
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
