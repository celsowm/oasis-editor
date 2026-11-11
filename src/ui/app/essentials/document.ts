import { insertShapeAtSelection } from "@/core/commands/shape.js";
import {
  alignSelectedFloatingObject,
  nudgeSelectedFloatingObject,
  setSelectedFloatingFixedPosition,
  setSelectedFloatingPositionPreset,
  setSelectedFloatingRotation,
  setSelectedFloatingWrapPreset,
  setSelectedFloatingWrapText,
} from "@/core/commands/floatingAlignCommands.js";
import { reorderSelectedFloatingObject } from "@/core/commands/floatingReorderCommands.js";
import {
  setSelectedShapeFill,
  setSelectedShapeOutline,
  setSelectedShapeOutlineWidth,
  setSelectedShapePreset,
} from "@/core/commands/shapeFillCommands.js";
import {
  getSelectedTextBoxSizeCm,
  rotateSelectedTextBoxByStep,
  setSelectedTextBoxAlt,
  setSelectedTextBoxHeightCm,
  setSelectedTextBoxTextDirection,
  setSelectedTextBoxVerticalAlign,
  setSelectedTextBoxWidthCm,
} from "@/core/commands/textBoxBodyCommands.js";
import { getSelectedTextBoxRun } from "@/core/commands/textBox.js";
import { insertHtmlAtSelection } from "@/core/commands/html.js";
import { MERGE_KEYS } from "@/core/transactionMergeKeys.js";
import { hasActiveTable } from "@/app/services/tablePropertiesService.js";
import {
  getDocumentParagraphs,
  resolveNamedTextStyle,
  type EditorState,
} from "@/core/model.js";
import { resolveNamedTableStyle } from "@/core/tableStyleResolver.js";
import type {
  EssentialsDocumentCapability,
  EssentialsDocumentStyleDescriptor,
} from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsDocument(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsDocumentCapability {
  return {
    documentStyles: (): EssentialsDocumentStyleDescriptor[] => {
      const document = options.state().document;
      const styles = document?.styles ?? {};
      const usedStyleIds = new Set<string>();
      for (const paragraph of getDocumentParagraphs(document)) {
        if (paragraph.style?.styleId) usedStyleIds.add(paragraph.style.styleId);
        for (const run of paragraph.runs) {
          if (run.styles?.styleId) usedStyleIds.add(run.styles.styleId);
        }
      }
      return Object.values(styles).map((style) => {
        const preview = resolveNamedTextStyle(style.id, styles);
        const tableStyle =
          style.type === "table"
            ? resolveNamedTableStyle(style.id, styles).tableStyle
            : undefined;
        const whole = tableStyle?.conditionalFormats?.wholeTable;
        const header = tableStyle?.conditionalFormats?.firstRow;
        const band = tableStyle?.conditionalFormats?.band1Horz;
        const border =
          whole?.borders?.borderBottom ?? tableStyle?.borders?.borderBottom;
        return {
          id: style.id,
          name: style.name,
          type: style.type,
          qFormat: style.qFormat,
          uiPriority: style.uiPriority,
          semiHidden: style.semiHidden,
          unhideWhenUsed: style.unhideWhenUsed,
          isUsed: usedStyleIds.has(style.id),
          fontFamily: preview.fontFamily?.trim() || undefined,
          fontSize:
            typeof preview.fontSize === "number" ? preview.fontSize : undefined,
          color: preview.color ?? undefined,
          bold: preview.bold ?? undefined,
          italic: preview.italic ?? undefined,
          tablePreview: tableStyle
            ? {
                wholeFill: whole?.shading,
                headerFill: header?.shading,
                bandFill: band?.shading,
                borderColor: border?.color,
                headerColor: header?.textStyle?.color ?? undefined,
              }
            : undefined,
        };
      });
    },
    newDocument: (): void => options.newDocument(),
    saveDocument: (): void => options.saveDocument(),
    openSymbolDialog: (): void => options.openSymbolDialog(),
    openEquationDialog: (): void => options.openEquationDialog(),
    hasActiveTable: (): boolean => hasActiveTable(options.state()),
    openTableProperties: (activeTab?: "table" | "cell"): void =>
      options.openTablePropertiesDialog(activeTab ?? "table"),
    exportDocx: (): undefined => void options.docIO.handleExportDocx(),
    exportPdf: (): undefined => void options.docIO.handleExportPdf(),
    printDocument: (): undefined => void options.docIO.handlePrint(),
    importDocument: (): void | undefined => options.importInputRef()?.click(),
    insertImage: (): void | undefined => options.imageInputRef()?.click(),
    insertHtml: (html: string): void =>
      options.applyTransactionalState((current): EditorState =>
        insertHtmlAtSelection(current, html),
      ),
    insertShape: (preset: string): void =>
      options.applyTransactionalState((current): EditorState =>
        insertShapeAtSelection(current, preset),
      ),
    setShapeFill: (fill: string | null): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedShapeFill(current, fill),
        { mergeKey: MERGE_KEYS.shapeFill },
      ),
    setShapeOutline: (color: string | null): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedShapeOutline(current, color),
        { mergeKey: MERGE_KEYS.shapeOutline },
      ),
    setShapeOutlineWidth: (widthPt: number): void =>
      options.applyTransactionalState(
        (current): EditorState =>
          setSelectedShapeOutlineWidth(current, widthPt),
        { mergeKey: MERGE_KEYS.shapeOutlineWidth },
      ),
    alignFloatingObject: (align: "left" | "center" | "right"): void =>
      options.applyTransactionalState(
        (current): EditorState => alignSelectedFloatingObject(current, align),
        { mergeKey: MERGE_KEYS.floatingAlign },
      ),
    reorderFloatingObject: (move: "front" | "back"): void =>
      options.applyTransactionalState(
        (current): EditorState => reorderSelectedFloatingObject(current, move),
        { mergeKey: MERGE_KEYS.floatingReorder },
      ),
    nudgeFloatingObject: (dx: number, dy: number): void =>
      options.applyTransactionalState(
        (current): EditorState => nudgeSelectedFloatingObject(current, dx, dy),
        { mergeKey: MERGE_KEYS.floatingNudge },
      ),
    setFloatingFixedPosition: (fixed: boolean): void =>
      options.applyTransactionalState(
        (current): EditorState =>
          setSelectedFloatingFixedPosition(current, fixed),
        { mergeKey: MERGE_KEYS.floatingFixedPosition },
      ),
    setFloatingRotation: (degrees: number): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedFloatingRotation(current, degrees),
        { mergeKey: MERGE_KEYS.floatingRotation },
      ),
    setFloatingWrapPreset: (
      preset:
        | "inline"
        | "square"
        | "tight"
        | "through"
        | "topAndBottom"
        | "behind"
        | "front",
    ): void =>
      options.applyTransactionalState(
        (current): EditorState =>
          setSelectedFloatingWrapPreset(current, preset),
        { mergeKey: MERGE_KEYS.floatingWrap },
      ),
    setFloatingWrapText: (
      side: "bothSides" | "left" | "right" | "largest",
    ): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedFloatingWrapText(current, side),
        { mergeKey: MERGE_KEYS.floatingWrapText },
      ),
    setFloatingPositionPreset: (
      preset:
        | "topLeft"
        | "topCenter"
        | "topRight"
        | "middleLeft"
        | "middleCenter"
        | "middleRight"
        | "bottomLeft"
        | "bottomCenter"
        | "bottomRight",
    ): void =>
      options.applyTransactionalState(
        (current): EditorState =>
          setSelectedFloatingPositionPreset(current, preset),
        { mergeKey: MERGE_KEYS.floatingPositionPreset },
      ),
    setShapePreset: (preset: string): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedShapePreset(current, preset),
        { mergeKey: MERGE_KEYS.shapePreset },
      ),
    setTextBoxTextDirection: (
      dir: "horz" | "vert" | "vert270" | "wordArtVert",
    ): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedTextBoxTextDirection(current, dir),
        { mergeKey: MERGE_KEYS.textBoxTextDirection },
      ),
    setTextBoxVerticalAlign: (anchor: "t" | "ctr" | "b"): void =>
      options.applyTransactionalState(
        (current): EditorState =>
          setSelectedTextBoxVerticalAlign(current, anchor),
        { mergeKey: MERGE_KEYS.textBoxVerticalAlign },
      ),
    setTextBoxAlt: (alt: string | null): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedTextBoxAlt(current, alt),
        { mergeKey: MERGE_KEYS.textBoxAlt },
      ),
    rotateTextBox: (direction: "left" | "right"): void =>
      options.applyTransactionalState(
        (current): EditorState =>
          rotateSelectedTextBoxByStep(current, direction),
        { mergeKey: MERGE_KEYS.textBoxRotate },
      ),
    getTextBoxSizeCm: (): { width: number; height: number } | null =>
      getSelectedTextBoxSizeCm(options.state()),
    isTextBoxSelected: (): boolean =>
      getSelectedTextBoxRun(options.state()) !== null,
    setTextBoxWidthCm: (cm: number): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedTextBoxWidthCm(current, cm),
        { mergeKey: MERGE_KEYS.textBoxWidthCm },
      ),
    setTextBoxHeightCm: (cm: number): void =>
      options.applyTransactionalState(
        (current): EditorState => setSelectedTextBoxHeightCm(current, cm),
        { mergeKey: MERGE_KEYS.textBoxHeightCm },
      ),
  };
}
