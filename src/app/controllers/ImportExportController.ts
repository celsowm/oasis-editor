import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { DocumentImporter } from "../../core/import/DocumentImporter.js";
import { DocumentExporter } from "../../core/export/DocumentExporter.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { isTextBlock } from "../../core/document/BlockTypes.js";
import { Logger } from "../../core/utils/Logger.js";

export class ImportExportController {
  constructor(
    private runtime: DocumentRuntime,
    private importer: DocumentImporter,
    private exporter: DocumentExporter,
    private pdfExporter: DocumentExporter,
  ) {}

  async importDocx(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const docModel = await this.importer.importFromBuffer(arrayBuffer);

      const firstSection = docModel.sections[0];
      const firstBlock = firstSection?.children[0];
      const firstInlineId =
        firstBlock && isTextBlock(firstBlock)
          ? firstBlock.children[0]?.id
          : "";

      this.runtime.setState({
        document: docModel,
        selection: firstBlock
          ? {
              anchor: {
                sectionId: firstSection.id,
                blockId: firstBlock.id,
                inlineId: firstInlineId,
                offset: 0,
              },
              focus: {
                sectionId: firstSection.id,
                blockId: firstBlock.id,
                inlineId: firstInlineId,
                offset: 0,
              },
            }
          : null,
        editingMode: "main",
      });
    } catch (e) {
      Logger.error(
"Failed to import DOCX:", e);
    }
  }

  async exportDocx(): Promise<void> {
    try {
      const doc = this.runtime.getState().document;
      const blob = await this.exporter.exportToBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.metadata.title || "document"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      Logger.error(
"Failed to export DOCX:", e);
    }
  }

  async exportPdf(layout: LayoutState | null): Promise<void> {
    try {
      const doc = this.runtime.getState().document;
      const blob = await this.pdfExporter.exportToBlob(doc, layout ?? undefined);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.metadata.title || "document"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      Logger.error(
"Failed to export PDF:", e);
    }
  }
}
