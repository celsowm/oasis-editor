import { insertShapeAtSelection } from "@/core/commands/shape.js";
import {
  setSelectedShapeFill,
  setSelectedShapeOutline,
} from "@/core/commands/shapeFillCommands.js";
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
  };
}
