import type { EditorPosition, EditorState } from "../../../core/model.js";
import {
  insertImageAtSelection,
  setSelection,
} from "../../../core/editorCommands.js";
import { getMaxInlineImageWidth } from "../../../ui/imageGeometry.js";
import { readFileBuffer } from "../../../ui/clipboardImage.js";
import type { EditorLogger } from "../../../utils/logger.js";

export interface ImageInsertionServiceDeps {
  state: () => EditorState;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  surfaceRef: () => HTMLDivElement | null;
  logger: EditorLogger;
}

function arrayBufferToBase64(arrayBuffer: ArrayBuffer): string {
  return btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      "",
    ),
  );
}

export function createImageInsertionService(deps: ImageInsertionServiceDeps) {
  const insertImageFromFile = async (
    file: File,
    position?: EditorPosition | null,
  ) => {
    deps.logger.info(
      `image insert:start name="${file.name}" type=${file.type} size=${file.size}`,
    );
    const arrayBuffer = await readFileBuffer(file);
    const src = `data:${file.type};base64,${arrayBufferToBase64(arrayBuffer)}`;

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

  return {
    insertImageFromFile,
  };
}
