import type { EditorDocument } from "../../core/model.js";
import {
  importDocxToEditorDocument,
  type DocxImportStage,
} from "./importDocxToEditorDocument.js";

interface ImportDocxInWorkerOptions {
  onProgress?: (stage: DocxImportStage, progress?: number) => void;
}

type WorkerResponse =
  | {
      type: "progress";
      id: number;
      stage: DocxImportStage;
      progress?: number;
    }
  | {
      type: "done";
      id: number;
      document: EditorDocument;
    }
  | {
      type: "error";
      id: number;
      error: string;
    };

let nextRequestId = 1;

function canUseDocxWorker(): boolean {
  return typeof Worker !== "undefined" && typeof URL !== "undefined";
}

export function importDocxInWorker(
  buffer: ArrayBuffer,
  options: ImportDocxInWorkerOptions = {},
): Promise<EditorDocument> {
  if (!canUseDocxWorker()) {
    return importDocxToEditorDocument(buffer, options);
  }

  const requestId = nextRequestId;
  nextRequestId += 1;

  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./importDocxWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    const cleanup = () => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
    };

    const handleError = (event: ErrorEvent) => {
      cleanup();
      reject(
        event.error instanceof Error ? event.error : new Error(event.message),
      );
    };

    const handleMessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data;
      if (!message || message.id !== requestId) {
        return;
      }

      if (message.type === "progress") {
        options.onProgress?.(message.stage, message.progress);
        return;
      }

      cleanup();
      if (message.type === "done") {
        resolve(message.document);
      } else {
        reject(new Error(message.error));
      }
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ type: "import-docx", id: requestId, buffer }, [
      buffer,
    ]);
  });
}
