import type { EditorState } from "@/core/model.js";
import {
  getDocumentParagraphs,
  getDocumentParagraphsCanonical,
  getDocumentSectionsCanonical,
  getParagraphText,
  resolveEffectiveParagraphStyle,
  resolveEffectiveTextStyleForParagraph,
} from "@/core/model.js";
import { createEditorStateFromDocument } from "@/core/editorState.js";
import { resolveImporterForFile } from "@/import/documentImporterRegistry.js";
import type { ImportStage } from "@/import/DocumentFormatImporter.js";
import { readFileBuffer } from "@/ui/clipboardImage.js";
import type { EditorLogger } from "@/utils/logger.js";
import { roundTo } from "@/utils/round.js";
import type { ImportProgressPhase } from "./importProgress.js";

function buildImportedDocumentDiagnostics(
  document: Parameters<typeof getDocumentParagraphs>[0],
) {
  const paragraphs = getDocumentParagraphs(document);
  const fontCounts = new Map<string, number>();
  const alignCounts = new Map<string, number>();
  let characterSpacingRuns = 0;
  let characterScaleRuns = 0;
  for (const paragraph of paragraphs) {
    const paragraphStyle = resolveEffectiveParagraphStyle(
      paragraph.style,
      document.styles,
    );
    alignCounts.set(
      paragraphStyle.align,
      (alignCounts.get(paragraphStyle.align) ?? 0) + 1,
    );
    for (const run of paragraph.runs) {
      const textStyle = resolveEffectiveTextStyleForParagraph(
        run.styles,
        paragraph.style?.styleId,
        document.styles,
      );
      const fontFamily = textStyle.fontFamily ?? "<null>";
      fontCounts.set(fontFamily, (fontCounts.get(fontFamily) ?? 0) + 1);
      if (textStyle.characterSpacing !== null) {
        characterSpacingRuns += 1;
      }
      if (textStyle.characterScale !== null) {
        characterScaleRuns += 1;
      }
    }
  }

  return {
    paragraphCount: paragraphs.length,
    alignCounts: Array.from(alignCounts.entries()),
    fontCounts: Array.from(fontCounts.entries()),
    characterSpacingRuns,
    characterScaleRuns,
    firstParagraphs: paragraphs.slice(0, 30).map((paragraph, index) => {
      const paragraphStyle = resolveEffectiveParagraphStyle(
        paragraph.style,
        document.styles,
      );
      const firstRun = paragraph.runs[0];
      const textStyle = resolveEffectiveTextStyleForParagraph(
        firstRun?.styles,
        paragraph.style?.styleId,
        document.styles,
      );
      return {
        index,
        textLength: getParagraphText(paragraph).length,
        runCount: paragraph.runs.length,
        rawParagraphStyle: paragraph.style,
        align: paragraphStyle.align,
        indentFirstLine: paragraphStyle.indentFirstLine,
        lineGridPitch: paragraphStyle.lineGridPitch,
        lineGridType: paragraphStyle.lineGridType,
        fontFamily: textStyle.fontFamily,
        fontSize: textStyle.fontSize,
        characterSpacing: textStyle.characterSpacing,
        characterScale: textStyle.characterScale,
        firstRunStyle: firstRun?.styles,
      };
    }),
  };
}

export interface DocumentImporterDeps {
  applyState: (state: EditorState) => void;
  stabilizeLayoutAfterImport: () => Promise<void>;
  resetEditorChromeState: () => void;
  focusInput: () => void;
  setImportPhase: (phase: ImportProgressPhase, subProgress?: number) => void;
  clearImportProgressSoon: () => void;
  now: () => number;
  logger: EditorLogger;
}

export function createDocumentImporter(deps: DocumentImporterDeps): { handleImportFile: (file: File | null) => Promise<void>; } {
  const handleImportFile = async (file: File | null): Promise<void> => {
    if (!file) return;

    const importer = resolveImporterForFile(file);
    if (!importer) {
      deps.setImportPhase("error");
      deps.logger.error("import:unsupported-format", {
        name: file.name,
        type: file.type,
      });
      deps.clearImportProgressSoon();
      return;
    }

    const startedAt = deps.now();
    deps.logger.info("import:start", {
      format: importer.id,
      name: file.name,
      size: file.size,
    });
    deps.setImportPhase("reading-file");

    try {
      const readingStartedAt = deps.now();
      const arrayBuffer = await readFileBuffer(file);
      deps.logger.info("import:phase", {
        phase: "reading-file",
        durationMs: roundTo(deps.now() - readingStartedAt, 2),
      });

      let lastProgressStage: ImportStage | null = null;
      let lastProgressValue = -1;
      let lastProgressAt = 0;
      const document = await importer.import(
        arrayBuffer,
        (stage, subProgress): void => {
          const now = deps.now();
          const roundedProgress =
            subProgress === undefined || !Number.isFinite(subProgress)
              ? undefined
              : Math.floor(subProgress * 100);
          const stageChanged = stage !== lastProgressStage;
          const progressChanged =
            roundedProgress !== undefined &&
            (lastProgressValue < 0 || roundedProgress - lastProgressValue >= 1);
          const timeElapsed = now - lastProgressAt >= 40;
          if (!stageChanged && !progressChanged && !timeElapsed) {
            return;
          }

          lastProgressStage = stage;
          lastProgressValue = roundedProgress ?? lastProgressValue;
          lastProgressAt = now;
          deps.setImportPhase(stage, subProgress);
          const payload = { phase: stage, subProgress };
          if (stageChanged || subProgress === undefined || subProgress === 1) {
            deps.logger.info("import:phase", payload);
          } else {
            deps.logger.debug("import:phase", payload);
          }
        },
      );
      deps.logger.debug(
        "import:document-diagnostics",
        buildImportedDocumentDiagnostics(document),
      );

      deps.setImportPhase("applying-editor-state");
      deps.resetEditorChromeState();
      deps.applyState(createEditorStateFromDocument(document));

      const stabilizationStartedAt = deps.now();
      deps.setImportPhase("stabilizing-layout");
      await deps.stabilizeLayoutAfterImport();
      deps.logger.info("import:phase", {
        phase: "stabilizing-layout",
        durationMs: roundTo(deps.now() - stabilizationStartedAt, 2),
      });

      const sections = getDocumentSectionsCanonical(document);
      const canonicalBlocks = sections.reduce(
        (total, section): number =>
          total +
          (section.header?.length ?? 0) +
          section.blocks.length +
          (section.footer?.length ?? 0),
        0,
      );
      const canonicalParagraphs =
        getDocumentParagraphsCanonical(document).length;
      deps.setImportPhase("done");
      deps.logger.info("import:done", {
        format: importer.id,
        blocks: canonicalBlocks,
        paragraphs: canonicalParagraphs,
        durationMs: roundTo(deps.now() - startedAt, 2),
      });
      deps.focusInput();
    } catch (error) {
      deps.setImportPhase("error");
      deps.logger.error("import:error", error);
    } finally {
      deps.clearImportProgressSoon();
    }
  };

  return {
    handleImportFile,
  };
}
