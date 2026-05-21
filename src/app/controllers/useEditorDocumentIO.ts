import { createSignal } from "solid-js";
import type {
  EditorState,
  EditorDocument,
  EditorPosition,
} from "../../core/model.js";
import {
  getDocumentParagraphsCanonical,
  getDocumentSectionsCanonical,
} from "../../core/model.js";
import {
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import {
  insertImageAtSelection,
  setSelection,
} from "../../core/editorCommands.js";
import { exportEditorDocumentToDocxBlob } from "../../export/docx/exportEditorDocumentToDocx.js";
import { importDocxInWorker } from "../../import/docx/importDocxInWorker.js";
import type { DocxImportStage } from "../../import/docx/importDocxToEditorDocument.js";
import { getMaxInlineImageWidth } from "../../ui/imageGeometry.js";
import { readFileBuffer } from "../../ui/clipboardImage.js";

export type ImportProgressPhase =
  | "reading-file"
  | DocxImportStage
  | "applying-editor-state"
  | "stabilizing-layout"
  | "done"
  | "error";

export interface ImportProgressState {
  phase: ImportProgressPhase;
  progress: number;
  subProgress?: number;
}

const PHASE_RANGES: Record<ImportProgressPhase, [number, number]> = {
  "reading-file": [0, 8],
  "opening-docx": [8, 20],
  "parsing-document": [20, 72],
  "parsing-headers-footers": [72, 78],
  "applying-editor-state": [78, 88],
  "stabilizing-layout": [88, 98],
  done: [100, 100],
  error: [100, 100],
};

export interface UseEditorDocumentIOProps {
  state: () => EditorState;
  applyState: (state: EditorState) => void;
  applyTransactionalState: (producer: (current: EditorState) => EditorState, options?: { mergeKey?: string }) => void;
  isReadOnly: () => boolean;
  surfaceRef: () => HTMLDivElement | null;
  stabilizeLayoutAfterImport: () => Promise<void>;
  resetEditorChromeState: () => void;
  focusInput: () => void;
  logger: { debug: (msg: string, payload?: any) => void; info: (msg: string, payload?: any) => void; error: (msg: string, payload?: any) => void };
}

export function createEditorDocumentIO(deps: UseEditorDocumentIOProps) {
  const [importProgress, setImportProgress] = createSignal<ImportProgressState | null>(null);

  const computeProgress = (phase: ImportProgressPhase, subProgress?: number): number => {
    const [min, max] = PHASE_RANGES[phase];
    if (subProgress !== undefined && Number.isFinite(subProgress)) {
      return Math.round((min + (max - min) * Math.min(1, Math.max(0, subProgress))) * 10) / 10;
    }
    return max;
  };

  const setImportPhase = (phase: ImportProgressPhase, subProgress?: number) => {
    setImportProgress({
      phase,
      progress: computeProgress(phase, subProgress),
      subProgress,
    });
  };

  const clearImportProgressSoon = () => {
    globalThis.setTimeout(() => {
      setImportProgress((current) =>
        current?.phase === "done" || current?.phase === "error" ? null : current,
      );
    }, 1200);
  };

  const handleImportDocx = async (file: File | null) => {
    if (deps.isReadOnly()) return;
    if (!file) return;

    const startedAt = performance.now();
    deps.logger.info("import docx:start", { name: file.name, size: file.size });
    setImportPhase("reading-file");

    try {
      const readingStartedAt = performance.now();
      const arrayBuffer = await readFileBuffer(file);
      deps.logger.info("import docx:phase", {
        phase: "reading-file",
        durationMs: Math.round((performance.now() - readingStartedAt) * 100) / 100,
      });

      let lastProgressStage: DocxImportStage | null = null;
      let lastProgressValue = -1;
      let lastProgressAt = 0;
      const document = await importDocxInWorker(arrayBuffer, {
        onProgress: (stage, subProgress) => {
          const now = performance.now();
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
          setImportPhase(stage, subProgress);
          const payload = { phase: stage, subProgress };
          if (stageChanged || subProgress === undefined || subProgress === 1) {
            deps.logger.info("import docx:phase", payload);
          } else {
            deps.logger.debug("import docx:phase", payload);
          }
        },
      });

      setImportPhase("applying-editor-state");
      deps.resetEditorChromeState();
      deps.applyState(createEditorStateFromDocument(document));



      const stabilizationStartedAt = performance.now();
      setImportPhase("stabilizing-layout");
      await deps.stabilizeLayoutAfterImport();
      deps.logger.info("import docx:phase", {
        phase: "stabilizing-layout",
        durationMs: Math.round((performance.now() - stabilizationStartedAt) * 100) / 100,
      });

      const sections = getDocumentSectionsCanonical(document);
      const canonicalBlocks = sections.reduce(
        (total, section) =>
          total + (section.header?.length ?? 0) + section.blocks.length + (section.footer?.length ?? 0),
        0,
      );
      const canonicalParagraphs = getDocumentParagraphsCanonical(document).length;
      setImportPhase("done");
      deps.logger.info("import docx:done", {
        blocks: canonicalBlocks,
        paragraphs: canonicalParagraphs,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      });
      deps.focusInput();
    } catch (error) {
      setImportPhase("error");
      deps.logger.error("import docx:error", error);
    } finally {
      clearImportProgressSoon();
    }
  };

  const insertImageFromFile = async (
    file: File,
    position?: EditorPosition | null,
  ) => {
    deps.logger.info(
      `image insert:start name="${file.name}" type=${file.type} size=${file.size}`,
    );
    const arrayBuffer = await readFileBuffer(file);
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );
    const src = `data:${file.type};base64,${base64}`;

    const img = new Image();
    img.src = src;
    await new Promise((resolve) => {
      img.onload = resolve;
      img.onerror = resolve;
    });

    const naturalWidth = img.naturalWidth || 300;
    const naturalHeight = img.naturalHeight || 300;
    const state = deps.state();
    const targetParagraphId =
      position?.paragraphId ?? state.selection.focus.paragraphId;
    const maxWidth = getMaxInlineImageWidth(
      deps.surfaceRef() ?? undefined,
      state.document,
      targetParagraphId,
      state.activeSectionIndex ?? 0,
    );
    const scale = naturalWidth > maxWidth ? maxWidth / naturalWidth : 1;
    const width = Math.max(24, Math.round(naturalWidth * scale));
    const height = Math.max(24, Math.round(naturalHeight * scale));
    deps.logger.info(
      `image insert:decoded natural=${naturalWidth}x${naturalHeight} fitted=${width}x${height} maxWidth=${maxWidth}`,
    );

    deps.applyTransactionalState(
      (current) => {
        const targetState = position
          ? setSelection(current, { anchor: position, focus: position })
          : current;
        return insertImageAtSelection(targetState, { src, width, height });
      },
      { mergeKey: "insertImage" },
    );
  };

  const handleInsertImage = async (file: File | null) => {
    if (deps.isReadOnly()) return;
    if (!file) return;

    await insertImageFromFile(file);
    deps.focusInput();
  };

  const handleExportDocx = async () => {
    const blob = await exportEditorDocumentToDocxBlob(deps.state().document);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "oasis-editor.docx";
    anchor.click();
    URL.revokeObjectURL(url);
    deps.focusInput();
  };

  return {
    importProgress,
    handleImportDocx,
    handleExportDocx,
    insertImageFromFile,
    handleInsertImage,
  };
}
