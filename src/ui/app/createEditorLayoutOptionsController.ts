import type { EditorState } from "@/core/model.js";
import { getRunImage, resolveImageSrc } from "@/core/model.js";
import {
  getSelectedImageRun,
  getSelectedImageWrapPreset,
  isSelectedImageFixedPosition,
  setSelectedImageFixedPosition,
  setImageWrapPolygon,
  setSelectedImageWrapPreset,
} from "@/core/commands/image.js";
import {
  getSelectedTextBoxRun,
  getSelectedTextBoxWrapPreset,
  isSelectedTextBoxFixedPosition,
  setSelectedTextBoxFixedPosition,
  setSelectedTextBoxWrapPreset,
} from "@/core/commands/textBox.js";
import type { WrapPreset } from "@/core/commands/floatingLayout.js";
import { getCachedCanvasImage } from "@/ui/canvas/canvasImageCache.js";
import { traceImageAlphaContour } from "@/ui/canvas/imageContour.js";
import type { LayoutOptionsOverlay } from "@/ui/editorUiTypes.js";

export interface EditorLayoutOptionsControllerDeps {
  state: () => EditorState;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    transform: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  focusInput: () => void;
}

/**
 * Builds the Layout Options overlay controller (Word-style text-wrapping popup
 * for the selected image / text box). Extracted from `OasisEditorApp` so the
 * composition root does not carry per-feature operation logic (S1). See
 * [[layout-options-feature]].
 */
export function createEditorLayoutOptionsController(
  deps: EditorLayoutOptionsControllerDeps,
): LayoutOptionsOverlay {
  const {
    state,
    resetTransactionGrouping,
    applyTransactionalState,
    focusInput,
  } = deps;

  const layoutOptionsTarget = (): "image" | "textBox" | null => {
    if (getSelectedImageRun(state())) return "image";
    if (getSelectedTextBoxRun(state())) return "textBox";
    return null;
  };

  const applyLayoutOptionPatch = (
    mergeKey: string,
    apply: (current: EditorState, target: "image" | "textBox") => EditorState,
  ) => {
    const target = layoutOptionsTarget();
    if (!target) return;
    resetTransactionGrouping();
    applyTransactionalState((current) => apply(current, target), { mergeKey });
    focusInput();
  };

  // After switching an image to tight/through, auto-trace its alpha contour (if
  // it has none yet) and store it. Mirrors the async-font → relayout pattern.
  const ensureImageWrapContour = (runId: string, src: string) => {
    const resolved = resolveImageSrc(state().document, src);
    const applyContour = (img: HTMLImageElement) => {
      const polygon = traceImageAlphaContour(img);
      applyTransactionalState(
        (current) => setImageWrapPolygon(current, runId, polygon),
        { mergeKey: "layoutWrapPolygon" },
      );
    };
    const img = getCachedCanvasImage(resolved, () => {
      if (img.naturalWidth > 0) applyContour(img);
    });
    if (img.complete && img.naturalWidth > 0) {
      applyContour(img);
    }
  };

  return {
    target: layoutOptionsTarget,
    preset: () => {
      const target = layoutOptionsTarget();
      if (target === "image") return getSelectedImageWrapPreset(state());
      if (target === "textBox") return getSelectedTextBoxWrapPreset(state());
      return null;
    },
    fixedPosition: () => {
      const target = layoutOptionsTarget();
      if (target === "image") return isSelectedImageFixedPosition(state());
      if (target === "textBox") return isSelectedTextBoxFixedPosition(state());
      return false;
    },
    setPreset: (preset: WrapPreset) => {
      applyLayoutOptionPatch("layoutWrapPreset", (current, target) =>
        target === "image"
          ? setSelectedImageWrapPreset(current, preset)
          : setSelectedTextBoxWrapPreset(current, preset),
      );
      if (preset === "tight" || preset === "through") {
        const selected = getSelectedImageRun(state());
        const image = selected && getRunImage(selected.run);
        if (image && !image.wrapPolygon) {
          ensureImageWrapContour(selected!.run.id, image.src);
        }
      }
    },
    setFixedPosition: (fixed: boolean) =>
      applyLayoutOptionPatch("layoutFixedPosition", (current, target) =>
        target === "image"
          ? setSelectedImageFixedPosition(current, fixed)
          : setSelectedTextBoxFixedPosition(current, fixed),
      ),
  };
}
