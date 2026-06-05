import {
  importDocxToEditorDocument,
  type DocxImportStage,
} from "./importDocxToEditorDocument.js";

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
  async (event: MessageEvent<ImportWorkerRequest>) => {
    const message = event.data;
    if (message?.type !== "import-docx") {
      return;
    }

    try {
      const document = await importDocxToEditorDocument(message.buffer, {
        onProgress: (stage, progress) => {
          post({ type: "progress", id: message.id, stage, progress });
        },
      });
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
