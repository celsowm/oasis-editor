import {
  importDocxToEditorDocument,
  type DocxImportStage,
} from "./importDocxToEditorDocument.js";
import { captureRebuiltDocxPartHashes } from "@/export/docx/opc/rebuiltPartHashes.js";
import { captureDocxSourcePackage } from "./opc/sourcePackage.js";
import { prepareDocxForCurrentImporter } from "./opc/legacyCompatibilityPackage.js";

type ImportWorkerRequest = {
  type: "import-docx";
  id: number;
  buffer: ArrayBuffer;
};

type ImportWorkerProgress = {
  type: "progress";
  id: number;
  stage: DocxImportStage;
  progress?: number;
};

type ImportWorkerDone = {
  type: "done";
  id: number;
  document: Awaited<ReturnType<typeof importDocxToEditorDocument>>;
};

type ImportWorkerError = {
  type: "error";
  id: number;
  error: string;
};

type ImportWorkerResponse =
  | ImportWorkerProgress
  | ImportWorkerDone
  | ImportWorkerError;

function post(message: ImportWorkerResponse): void {
  globalThis.postMessage(message);
}

globalThis.addEventListener(
  "message",
  async (event: MessageEvent<ImportWorkerRequest>): Promise<void> => {
    const message = event.data;
    if (message?.type !== "import-docx") {
      return;
    }

    try {
      const sourcePackage = await captureDocxSourcePackage(message.buffer);
      const importerBuffer = await prepareDocxForCurrentImporter(
        message.buffer,
        sourcePackage,
      );
      const document = await importDocxToEditorDocument(importerBuffer, {
        onProgress: (stage, progress): void => {
          post({ type: "progress", id: message.id, stage, progress });
        },
      });
      sourcePackage.rebuiltPartHashes =
        await captureRebuiltDocxPartHashes(document);
      document.sourcePackage = sourcePackage;
      post({ type: "done", id: message.id, document });
    } catch (error) {
      post({
        type: "error",
        id: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },
);
