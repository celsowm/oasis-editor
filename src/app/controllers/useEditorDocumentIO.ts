import type { MergeKey } from "@/core/transactionMergeKeys.js";
import { createSignal } from "solid-js";
import type { EditorState, EditorPosition, EditorDocument } from "@/core/model.js";
import type { EditorLogger } from "@/utils/logger.js";
import { createDocumentExporter } from "./documentIO/DocumentExporter.js";
import { createDocumentImporter } from "./documentIO/DocumentImporter.js";
import { createImageInsertionService } from "./documentIO/ImageInsertionService.js";
import type {
  ImportProgressPhase,
  ImportProgressState,
} from "./documentIO/importProgress.js";

export type {
  ImportProgressPhase,
  ImportProgressState,
} from "./documentIO/importProgress.js";

const PHASE_RANGES: Record<ImportProgressPhase, [number, number]> = {
  "reading-file": [0, 8],
  opening: [8, 20],
  parsing: [20, 72],
  finishing: [72, 78],
  "applying-editor-state": [78, 88],
  "stabilizing-layout": [88, 98],
  done: [100, 100],
  error: [100, 100],
};

export interface UseEditorDocumentIOProps {
  state: () => EditorState;
  applyState: (state: EditorState) => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: MergeKey },
  ) => void;
  isReadOnly: () => boolean;
  surfaceRef: () => HTMLDivElement | null;
  stabilizeLayoutAfterImport: () => Promise<void>;
  resetEditorChromeState: () => void;
  focusInput: () => void;
  logger: EditorLogger;
}

export function createEditorDocumentIO(deps: UseEditorDocumentIOProps) {
  const [importProgress, setImportProgress] =
    createSignal<ImportProgressState | null>(null);

  const computeProgress = (
    phase: ImportProgressPhase,
    subProgress?: number,
  ): number => {
    const [min, max] = PHASE_RANGES[phase];
    if (subProgress !== undefined && Number.isFinite(subProgress)) {
      return (
        Math.round(
          (min + (max - min) * Math.min(1, Math.max(0, subProgress))) * 10,
        ) / 10
      );
    }
    return max;
  };

  const setImportPhase = (phase: ImportProgressPhase, subProgress?: number): void => {
    setImportProgress({
      phase,
      progress: computeProgress(phase, subProgress),
      subProgress,
    });
  };

  const clearImportProgressSoon = (): void => {
    globalThis.setTimeout((): void => {
      setImportProgress((current): ImportProgressState | null =>
        current?.phase === "done" || current?.phase === "error"
          ? null
          : current,
      );
    }, 1200);
  };

  const importer = createDocumentImporter({
    applyState: deps.applyState,
    stabilizeLayoutAfterImport: deps.stabilizeLayoutAfterImport,
    resetEditorChromeState: deps.resetEditorChromeState,
    focusInput: deps.focusInput,
    setImportPhase,
    clearImportProgressSoon,
    now: (): number => performance.now(),
    logger: deps.logger,
  });

  const imageInsertion = createImageInsertionService({
    state: deps.state,
    applyTransactionalState: deps.applyTransactionalState,
    surfaceRef: deps.surfaceRef,
    logger: deps.logger,
  });

  const exporter = createDocumentExporter({
    document: (): EditorDocument => deps.state().document,
    focusInput: deps.focusInput,
  });

  const handleImportFile = async (file: File | null): Promise<void> => {
    if (deps.isReadOnly()) return;
    await importer.handleImportFile(file);
  };

  const insertImageFromFile = async (
    file: File,
    position?: EditorPosition | null,
  ): Promise<void> => {
    await imageInsertion.insertImageFromFile(file, position);
  };

  const handleInsertImage = async (file: File | null): Promise<void> => {
    if (deps.isReadOnly()) return;
    if (!file) return;

    await insertImageFromFile(file);
    deps.focusInput();
  };

  const handleExportDocx = async (): Promise<void> => {
    await exporter.handleExportDocx();
  };

  const handleExportPdf = async (): Promise<void> => {
    await exporter.handleExportPdf();
  };

  return {
    importProgress,
    handleImportFile,
    handleExportDocx,
    handleExportPdf,
    insertImageFromFile,
    handleInsertImage,
  };
}
