import { t } from "../../../../i18n/index.js";
import { STANDARD_FONT_SIZES_PT, fontSizePxToPt } from "../../../fontSizeUnits.js";
import type {
  SelectOption,
  ToolbarActionApi,
  ToolbarDocumentStyle,
  ToolbarItem,
} from "../schema/items.js";
import { UnderlineControl } from "../controls/UnderlineControl.js";
import { ListOptionsControl } from "../controls/ListOptionsControl.js";
import { LineSpacingButton } from "../LineSpacingButton.js";
import { MetricGroup } from "../groups/MetricGroup.js";
import { TableGroup } from "../groups/TableGroup.js";
import { SectionGroup } from "../groups/SectionGroup.js";

const mod = /Mac/i.test(navigator.userAgent) ? "⌘" : "Ctrl";

/** Document's named styles, read through the uniform command-state channel. */
const documentStyles = (api: ToolbarActionApi): ToolbarDocumentStyle[] =>
  (api.commands.state("documentStyles").value as ToolbarDocumentStyle[] | undefined) ?? [];

const fontFamilyOptions = (api: ToolbarActionApi): SelectOption[] => {
  const values = new Set<string>([
    "Arial",
    "Calibri, sans-serif",
    "Calibri Light, sans-serif",
    "Georgia",
    "Inter",
    "Times New Roman",
    "Courier New",
  ]);
  for (const s of documentStyles(api)) {
    if (s.fontFamily) values.add(s.fontFamily);
  }
  const current = String(api.commands.state("setFontFamily").value ?? "").trim();
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
  tooltipKey: "toolbar.alignLeft" | "toolbar.alignCenter" | "toolbar.alignRight" | "toolbar.justify";
}> = [
  { command: "alignLeft", icon: "align-left", testId: "editor-toolbar-align-left", tooltipKey: "toolbar.alignLeft" },
  { command: "alignCenter", icon: "align-center", testId: "editor-toolbar-align-center", tooltipKey: "toolbar.alignCenter" },
  { command: "alignRight", icon: "align-right", testId: "editor-toolbar-align-right", tooltipKey: "toolbar.alignRight" },
  { command: "alignJustify", icon: "align-justify", testId: "editor-toolbar-align-justify", tooltipKey: "toolbar.justify" },
];

const LIST_BUTTONS: Array<{
  command: string;
  icon: string;
  testId: string;
  tooltipKey: "toolbar.bulletList" | "toolbar.numberedList";
}> = [
  { command: "bulletList", icon: "list", testId: "editor-toolbar-list-bullet", tooltipKey: "toolbar.bulletList" },
  { command: "orderedList", icon: "list-ordered", testId: "editor-toolbar-list-ordered", tooltipKey: "toolbar.numberedList" },
];

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
          label: "Export DOCX",
          wide: true,
          tooltip: "Export DOCX",
          command: "exportDocx",
        },
        {
          type: "button",
          id: "editor-toolbar-export-pdf",
          testId: "editor-toolbar-export-pdf",
          iconName: "file-down",
          label: "Export PDF",
          wide: true,
          tooltip: "Export PDF",
          command: "exportPdf",
        },
        {
          type: "button",
          id: "editor-toolbar-import-docx",
          testId: "editor-toolbar-import-docx",
          iconName: "upload",
          labelKey: "toolbar.import",
          wide: true,
          tooltipKey: "toolbar.import",
          command: "importDocx",
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
  items.push({ type: "separator", id: "sep-style" });

  // --- Format ---
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
    id: "editor-toolbar-superscript",
    testId: "editor-toolbar-superscript",
    iconName: "superscript",
    command: "superscript",
    tooltipKey: "toolbar.superscript",
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-subscript",
    testId: "editor-toolbar-subscript",
    iconName: "subscript",
    command: "subscript",
    tooltipKey: "toolbar.subscript",
  });
  items.push({ type: "separator", id: "sep-format" });

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
    id: "editor-toolbar-section",
    render: (api) => SectionGroup({ api }),
  });

  return items;
}
