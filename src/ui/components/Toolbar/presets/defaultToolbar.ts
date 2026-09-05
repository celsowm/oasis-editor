import type { TranslateFn } from "@/i18n/index.js";
import type { ToolbarItem } from "@/ui/components/Toolbar/schema/items.js";
import { UnderlineControl } from "@/ui/components/Toolbar/controls/UnderlineControl.js";
import { ListOptionsControl } from "@/ui/components/Toolbar/controls/ListOptionsControl.js";
import { LineSpacingButton } from "@/ui/components/Toolbar/LineSpacingButton.js";
import { MetricGroup } from "@/ui/components/Toolbar/groups/MetricGroup.js";
import { SectionGroup } from "@/ui/components/Toolbar/groups/SectionGroup.js";
import { MarginsGroup } from "@/ui/components/Toolbar/groups/MarginsGroup.js";
import { ShapeGallery } from "@/ui/components/Toolbar/ShapeGallery.js";
import { SymbolMenu } from "@/ui/components/Toolbar/SymbolMenu.js";
import { TableStyleGallery } from "@/ui/components/Toolbar/TableStyleGallery.js";
import { TableStyleOptions } from "@/ui/components/Toolbar/TableStyleOptions.js";
import { TableBordersMenu } from "@/ui/components/Toolbar/TableBordersMenu.js";
import {
  DesignGallery,
  DesignPageBorderPanel,
  DesignWatermarkPanel,
} from "@/ui/components/Toolbar/DesignGallery.js";
import {
  ImageSizeField,
  ImageCropMenu,
} from "@/ui/components/Toolbar/controls/ImageSizeControls.js";
import { withDefaultRibbonPlacement } from "./defaultToolbar/ribbonPlacements.js";
import {
  ALIGN_BUTTONS,
  LIST_BUTTONS,
  TABLE_LAYOUT_BUTTONS,
} from "./defaultToolbar/buttonSpecs.js";
import {
  documentStyles,
  fontFamilyOptions,
  fontSizeOptions,
  mod,
} from "./defaultToolbar/optionBuilders.js";

/**
 * The built-in toolbar, expressed as data. Every item dispatches through the
 * command registry (the single source of truth) — the editor uses the same
 * public contribution API clients use. Load each item into a registry via
 * `registry.register` (see Toolbar bootstrap).
 */
export function createDefaultToolbarPreset(t: TranslateFn): ToolbarItem[] {
  const items: ToolbarItem[] = [];

  // --- Design ---
  items.push({
    type: "menu",
    id: "editor-toolbar-design-themes",
    testId: "editor-toolbar-design-themes",
    tab: "design",
    group: "documentFormatting",
    row: 1,
    ribbonSize: "large",
    iconName: "palette",
    label: t("design.themes"),
    tooltip: t("design.themes"),
    panelClass: "oasis-editor-design-gallery-panel",
    content: { kind: "custom", render: (api) => DesignGallery({ api }) },
  });
  items.push({
    type: "button",
    id: "editor-toolbar-design-default",
    testId: "editor-toolbar-design-default",
    tab: "design",
    group: "documentFormatting",
    row: 2,
    iconName: "check",
    label: t("design.setDefault"),
    tooltip: t("design.setDefault"),
    command: "setDocumentDesignDefault",
  });
  items.push({
    type: "menu",
    id: "editor-toolbar-design-watermark",
    testId: "editor-toolbar-design-watermark",
    tab: "design",
    group: "pageBackground",
    row: 1,
    iconName: "droplets",
    label: t("design.watermark"),
    tooltip: t("design.watermark"),
    panelClass: "oasis-editor-design-background-panel-wrap",
    content: { kind: "custom", render: (api) => DesignWatermarkPanel({ api }) },
  });
  items.push({
    type: "colorPicker",
    id: "editor-toolbar-design-page-color",
    testId: "editor-toolbar-design-page-color",
    tab: "design",
    group: "pageBackground",
    row: 1,
    kind: "shading",
    command: "setDocumentPageColor",
    defaultValue: "#ffffff",
    label: t("design.pageColor"),
    tooltip: t("design.pageColor"),
    ribbonSize: "large",
  });
  items.push({
    type: "menu",
    id: "editor-toolbar-design-page-borders",
    testId: "editor-toolbar-design-page-borders",
    tab: "design",
    group: "pageBackground",
    row: 2,
    iconName: "frame",
    label: t("design.pageBorders"),
    tooltip: t("design.pageBorders"),
    panelClass: "oasis-editor-design-background-panel-wrap",
    content: {
      kind: "custom",
      render: (api) => DesignPageBorderPanel({ api }),
    },
  });

  // --- File ---
  items.push({
    type: "button",
    id: "editor-toolbar-new-document",
    testId: "editor-toolbar-new-document",
    iconName: "file-plus",
    labelKey: "toolbar.newDocument",
    tooltipKey: "toolbar.newDocument",
    command: "newDocument",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-import-document",
    testId: "editor-toolbar-import-document",
    iconName: "upload",
    labelKey: "toolbar.importDocx",
    tooltipKey: "toolbar.importDocx",
    command: "importDocument",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-export-docx",
    testId: "editor-toolbar-export-docx",
    iconName: "file-text",
    labelKey: "toolbar.exportDocx",
    tooltipKey: "toolbar.exportDocx",
    command: "exportDocx",
    ribbonSize: "large",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-export-pdf",
    testId: "editor-toolbar-export-pdf",
    iconName: "file-down",
    labelKey: "toolbar.exportPdf",
    tooltipKey: "toolbar.exportPdf",
    command: "exportPdf",
    ribbonSize: "large",
  });

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
    type: "custom",
    id: "editor-toolbar-symbols",
    testId: "editor-toolbar-symbols",
    ribbonSize: "large",
    render: (api) => SymbolMenu({ api }),
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

  // --- Image Format (contextual tab): Size group (crop + height/width) ---
  items.push({
    type: "menu",
    id: "editor-toolbar-image-crop",
    testId: "editor-toolbar-image-crop",
    iconName: "crop",
    tooltipKey: "image.crop",
    labelKey: "image.crop",
    ribbonSize: "large",
    isActive: (api) => api.commands.state("imageCrop").isActive,
    panelClass: "oasis-editor-image-crop-panel",
    content: { kind: "custom", render: (api) => ImageCropMenu({ api }) },
  });
  items.push({
    type: "custom",
    id: "editor-toolbar-image-height",
    testId: "editor-toolbar-image-height",
    render: (api) => ImageSizeField({ api, dimension: "height" }),
  });
  items.push({
    type: "custom",
    id: "editor-toolbar-image-width",
    testId: "editor-toolbar-image-width",
    render: (api) => ImageSizeField({ api, dimension: "width" }),
  });

  // --- Image Format (contextual tab): Picture Styles group ---
  items.push({
    type: "pictureBorder",
    id: "editor-toolbar-image-border",
    testId: "editor-toolbar-image-border",
    command: "imageBorder",
    labelKey: "image.border",
    tooltipKey: "image.border",
    ribbonSize: "large",
  });

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
      labelKey: spec.labelKey,
      ribbonSize: spec.ribbonSize,
    });
  }

  // --- Table Design (contextual tab) ---
  // Table Style Options mirrors Word's compact two-column checkbox group.
  items.push({
    type: "custom",
    id: "editor-toolbar-tbl-style-options",
    tab: "tableDesign",
    group: "tableStyleOptions",
    row: 1,
    ribbonSize: "large",
    render: (api) => TableStyleOptions({ api }),
  });
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
    type: "custom",
    id: "editor-toolbar-tbl-borders",
    testId: "editor-toolbar-tbl-borders",
    ribbonSize: "large",
    render: (api) => TableBordersMenu({ api }),
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-tbl-border-painter",
    testId: "editor-toolbar-tbl-border-painter",
    iconName: "paintbrush",
    command: "toggleTableDrawBorders",
    label: "Pincel de Borda",
    tooltip: "Pincel de Borda",
    ribbonSize: "large",
  });
  // Table Styles: real previews of the document's effective table styles.
  items.push({
    type: "custom",
    id: "editor-toolbar-tbl-style",
    testId: "editor-toolbar-tbl-style",
    tab: "tableDesign",
    group: "tableStyles",
    row: 1,
    ribbonSize: "large",
    render: (api) =>
      TableStyleGallery({
        api,
        styles: documentStyles(api),
        testId: "editor-toolbar-tbl-style",
      }),
  });
  // Cell Size group on the Layout tab: distribute + AutoFit.
  items.push({
    type: "button",
    id: "editor-toolbar-tbl-distribute-rows",
    testId: "editor-toolbar-tbl-distribute-rows",
    iconName: "tableDistributeRows",
    command: "tableDistributeRows",
    tooltipKey: "table.distributeRows",
    labelKey: "table.distributeRows",
  });
  items.push({
    type: "button",
    id: "editor-toolbar-tbl-distribute-cols",
    testId: "editor-toolbar-tbl-distribute-cols",
    iconName: "tableDistributeColumns",
    command: "tableDistributeColumns",
    tooltipKey: "table.distributeColumns",
    labelKey: "table.distributeColumns",
  });
  items.push({
    type: "toggle",
    id: "editor-toolbar-tbl-autofit",
    testId: "editor-toolbar-tbl-autofit",
    iconName: "tableAutoFit",
    command: "tableToggleAutoFit",
    labelKey: "table.autoFit",
    tooltipKey: "table.autoFit",
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
