import type { EditorState } from "../../../core/model.js";
import {
  getDocumentParagraphsCanonical,
  getDocumentSectionsCanonical,
} from "../../../core/model.js";
import { createEditorStateFromDocument } from "../../../core/editorState.js";
import { importDocxInWorker } from "../../../import/docx/importDocxInWorker.js";
import type { DocxImportStage } from "../../../import/docx/importDocxToEditorDocument.js";
import { readFileBuffer } from "../../../ui/clipboardImage.js";
import type { EditorLogger } from "../../../utils/logger.js";
import type { ImportProgressPhase } from "../useEditorDocumentIO.js";

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

export function createDocumentImporter(deps: DocumentImporterDeps) {
  const handleImportDocx = async (file: File | null) => {
    if (!file) return;

    const startedAt = deps.now();
    deps.logger.info("import docx:start", { name: file.name, size: file.size });
    deps.setImportPhase("reading-file");

    try {
      const readingStartedAt = deps.now();
      const arrayBuffer = await readFileBuffer(file);
      deps.logger.info("import docx:phase", {
        phase: "reading-file",
        durationMs: Math.round((deps.now() - readingStartedAt) * 100) / 100,
      });

      let lastProgressStage: DocxImportStage | null = null;
      let lastProgressValue = -1;
      let lastProgressAt = 0;
      const document = await importDocxInWorker(arrayBuffer, {
        onProgress: (stage, subProgress) => {
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
            deps.logger.info("import docx:phase", payload);
          } else {
            deps.logger.debug("import docx:phase", payload);
          }
        },
      });

      deps.setImportPhase("applying-editor-state");
      deps.resetEditorChromeState();
      deps.applyState(createEditorStateFromDocument(document));

      const stabilizationStartedAt = deps.now();
      deps.setImportPhase("stabilizing-layout");
      await deps.stabilizeLayoutAfterImport();
      deps.logger.info("import docx:phase", {
        phase: "stabilizing-layout",
        durationMs: Math.round((deps.now() - stabilizationStartedAt) * 100) / 100,
      });

      const sections = getDocumentSectionsCanonical(document);
      const canonicalBlocks = sections.reduce(
        (total, section) =>
          total + (section.header?.length ?? 0) + section.blocks.length + (section.footer?.length ?? 0),
        0,
      );
      const canonicalParagraphs = getDocumentParagraphsCanonical(document).length;
      deps.setImportPhase("done");
      deps.logger.info("import docx:done", {
        blocks: canonicalBlocks,
        paragraphs: canonicalParagraphs,
        durationMs: Math.round((deps.now() - startedAt) * 100) / 100,
      });
      deps.focusInput();
    } catch (error) {
      deps.setImportPhase("error");
      deps.logger.error("import docx:error", error);
    } finally {
      deps.clearImportProgressSoon();
    }
  };

  return {
    handleImportDocx,
  };
}
