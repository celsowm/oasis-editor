import { createEffect, createSignal, onCleanup } from "solid-js";
import type { EditorLayoutParagraph, EditorState } from "../../core/model.js";
import { buildCanvasLayoutSnapshot } from "../../ui/canvas/CanvasLayoutSnapshot.js";
import { computeCanvasSelectionGeometry } from "../../ui/canvas/CanvasSelectionGeometry.js";
import type { CaretBox, InputBox, SelectionBox } from "../../ui/editorUiTypes.js";
import type { SelectedImageSelectionBox } from "../../ui/canvas/CanvasSelectionGeometry.js";

interface UseEditorLayoutProps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  isImporting?: () => boolean;
  layoutMode?: "fast" | "wordParity";
}

type LayoutSyncReason =
  | "selection"
  | "scroll"
  | "content-change"
  | "resize"
  | "import";

export interface LayoutInvalidation {
  dirtyParagraphIds?: string[];
  structureChanged?: boolean;
  dirtyAll?: boolean;
}

function scheduleFrame(callback: () => void): number {
  if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
    return window.requestAnimationFrame(() => callback());
  }
  return globalThis.setTimeout(callback, 16) as unknown as number;
}

function normalizeParagraphLayouts(
  current: Record<string, EditorLayoutParagraph>,
  dirtyParagraphIds: string[],
): Record<string, EditorLayoutParagraph> {
  if (dirtyParagraphIds.length === 0) {
    return current;
  }
  const next = { ...current };
  for (const paragraphId of dirtyParagraphIds) {
    delete next[paragraphId];
  }
  return next;
}

export function useEditorLayout(props: UseEditorLayoutProps) {
  const [measuredBlockHeights, setMeasuredBlockHeights] = createSignal<Record<string, number>>({});
  const [measuredParagraphLayouts, setMeasuredParagraphLayouts] = createSignal<Record<string, EditorLayoutParagraph>>({});
  const [inputBox, setInputBox] = createSignal<InputBox>({ left: 0, top: 0, height: 28 });
  const [selectionBoxes, setSelectionBoxes] = createSignal<SelectionBox[]>([]);
  const [selectedImageBox, setSelectedImageBox] = createSignal<SelectedImageSelectionBox | null>(null);
  const [caretBox, setCaretBox] = createSignal<CaretBox>({
    left: 0,
    top: 0,
    height: 28,
    visible: false,
  });
  const [preferredColumnX, setPreferredColumnX] = createSignal<number | null>(null);

  let syncRequestId = 0;

  const syncInputBox = (_reason: LayoutSyncReason = "selection") => {
    const surface = props.surfaceRef();
    if (!surface) {
      setSelectionBoxes([]);
      setSelectedImageBox(null);
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const snapshot = buildCanvasLayoutSnapshot({
      surface,
      state: props.state,
      measuredBlockHeights: measuredBlockHeights(),
      measuredParagraphLayouts: measuredParagraphLayouts(),
      layoutMode: props.layoutMode ?? "wordParity",
    });
    if (!snapshot) {
      setSelectionBoxes([]);
      setSelectedImageBox(null);
      setCaretBox((current) => ({ ...current, visible: false }));
      return;
    }

    const geometry = computeCanvasSelectionGeometry(snapshot, props.state);
    setSelectionBoxes(geometry.selectionBoxes);
    setSelectedImageBox(geometry.selectedImageBox);
    setInputBox(geometry.inputBox);
    setCaretBox(geometry.caretBox);
  };

  const requestInputBoxSync = (reason: LayoutSyncReason = "selection") => {
    const requestId = ++syncRequestId;
    queueMicrotask(() => {
      if (requestId !== syncRequestId) {
        return;
      }
      syncInputBox(reason);
    });
  };

  const syncMeasuredLayoutMetrics = (reason: LayoutSyncReason = "content-change"): boolean => {
    requestInputBoxSync(reason);
    return false;
  };

  const scheduleDeferredLayoutMeasurement = (
    reason: LayoutSyncReason,
    options: {
      paragraphIds?: string[];
      resolveWhenDone?: boolean;
      blockHeightScope?: "all" | "visible";
    } = {},
  ): Promise<void> | null => {
    if (options.paragraphIds && options.paragraphIds.length > 0) {
      setMeasuredParagraphLayouts((current) =>
        normalizeParagraphLayouts(current, options.paragraphIds ?? []),
      );
    }
    requestInputBoxSync(reason);
    return options.resolveWhenDone ? Promise.resolve() : null;
  };

  const applyInvalidation = (invalidation: LayoutInvalidation): void => {
    if (props.isImporting?.()) {
      return;
    }

    if (invalidation.dirtyAll || invalidation.structureChanged) {
      setMeasuredBlockHeights({});
      setMeasuredParagraphLayouts({});
    } else if ((invalidation.dirtyParagraphIds?.length ?? 0) > 0) {
      const dirtyIds = invalidation.dirtyParagraphIds ?? [];
      setMeasuredParagraphLayouts((current) => normalizeParagraphLayouts(current, dirtyIds));
    }

    requestInputBoxSync("content-change");
  };

  const stabilizeLayoutAfterImport = async () => {
    setMeasuredBlockHeights({});
    setMeasuredParagraphLayouts({});

    await new Promise<void>((resolve) => {
      scheduleFrame(() => resolve());
    });

    requestInputBoxSync("import");
  };

  createEffect(() => {
    props.state.selection.anchor.paragraphId;
    props.state.selection.anchor.runId;
    props.state.selection.anchor.offset;
    props.state.selection.focus.paragraphId;
    props.state.selection.focus.runId;
    props.state.selection.focus.offset;
    requestInputBoxSync("selection");
  });

  createEffect(() => {
    props.state.document;
    props.state.activeSectionIndex;
    props.state.activeZone;
    if (props.isImporting?.()) {
      return;
    }
    requestInputBoxSync("content-change");
  });

  createEffect(() => {
    const viewport = props.viewportRef();
    if (!viewport) {
      return;
    }

    const handleViewportScroll = () => {
      requestInputBoxSync("scroll");
    };
    const handleWindowResize = () => {
      requestInputBoxSync("resize");
    };

    viewport.addEventListener("scroll", handleViewportScroll, { passive: true });
    window.addEventListener("resize", handleWindowResize);

    onCleanup(() => {
      viewport.removeEventListener("scroll", handleViewportScroll);
      window.removeEventListener("resize", handleWindowResize);
    });
  });

  const clearPreferredColumn = () => setPreferredColumnX(null);

  const onCleanupHook = () => {
    syncRequestId += 1;
  };

  return {
    measuredBlockHeights,
    measuredParagraphLayouts,
    inputBox,
    selectionBoxes,
    selectedImageBox,
    caretBox,
    preferredColumnX,
    setPreferredColumnX,
    clearPreferredColumn,
    requestInputBoxSync,
    scheduleDeferredLayoutMeasurement,
    stabilizeLayoutAfterImport,
    syncMeasuredLayoutMetrics,
    syncInputBox,
    setMeasuredBlockHeights,
    setMeasuredParagraphLayouts,
    applyInvalidation,
    onCleanupHook,
  };
}
