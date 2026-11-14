import { createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import type {
  EditorLayoutParagraph,
  EditorState,
  EditorLayoutDocument,
} from "@/core/model.js";
import { computeCanvasSelectionGeometry } from "@/ui/canvas/CanvasSelectionGeometry.js";
import { projectTrackedRevisions } from "@/core/document/trackedRevisions.js";
import { computeCommentHighlights } from "@/ui/canvas/CanvasCommentGeometry.js";
import { computeRevisionMarkup } from "@/ui/canvas/CanvasRevisionGeometry.js";
import {
  bumpLayoutMetricsEpoch,
  layoutMetricsEpoch,
  projectDocumentLayout,
} from "@/layoutProjection/index.js";
import { createCanvasLayoutSnapshotProvider } from "@/ui/canvas/canvasLayoutSnapshotProvider.js";
import { canvasTextMeasurer } from "@/ui/canvas/canvasTextMeasurer.js";
import { createLayoutIdentityStabilizer } from "@/ui/layoutIdentity.js";
import type {
  CaretBox,
  CommentHighlightBox,
  InputBox,
  RevisionMarkupBox,
  SelectionBox,
} from "@/ui/editorUiTypes.js";
import type {
  SelectedImageSelectionBox,
  SelectedTextBoxSelectionBox,
  SelectedTableBox,
} from "@/ui/canvas/CanvasSelectionGeometry.js";

interface UseEditorLayoutProps {
  state: EditorState;
  surfaceRef: () => HTMLDivElement | undefined;
  viewportRef: () => HTMLDivElement | undefined;
  isImporting?: () => boolean;
  /** Current visual zoom factor; the snapshot stays zoom-invariant. */
  zoomFactor?: () => number;
}

type LayoutSyncReason =
  "selection" | "scroll" | "content-change" | "resize" | "import";

export interface LayoutInvalidation {
  dirtyParagraphIds?: string[];
  structureChanged?: boolean;
  dirtyAll?: boolean;
}

function scheduleFrame(callback: () => void): number {
  if (
    typeof window !== "undefined" &&
    typeof window.requestAnimationFrame === "function"
  ) {
    return window.requestAnimationFrame((): void => callback());
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
  // Only allocate a new object (which triggers a re-projection) when a dirty id
  // is actually present. Otherwise return the same reference so dependent memos
  // don't recompute for a no-op invalidation.
  let next: Record<string, EditorLayoutParagraph> | undefined;
  for (const paragraphId of dirtyParagraphIds) {
    if (Object.prototype.hasOwnProperty.call(current, paragraphId)) {
      next ??= { ...current };
      delete next[paragraphId];
    }
  }
  return next ?? current;
}

export function useEditorLayout(
  props: UseEditorLayoutProps,
): ReturnType<typeof useEditorLayoutImpl> {
  return useEditorLayoutImpl(props);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useEditorLayoutImpl(props: UseEditorLayoutProps) {
  const [measuredBlockHeights, setMeasuredBlockHeights] = createSignal<
    Record<string, number>
  >({});
  const [measuredParagraphLayouts, setMeasuredParagraphLayouts] = createSignal<
    Record<string, EditorLayoutParagraph>
  >({});
  const [inputBox, setInputBox] = createSignal<InputBox>({
    left: 0,
    top: 0,
    height: 28,
  });
  const [selectionBoxes, setSelectionBoxes] = createSignal<SelectionBox[]>([]);
  const [commentHighlights, setCommentHighlights] = createSignal<
    CommentHighlightBox[]
  >([]);
  const [revisionMarkupBoxes, setRevisionMarkupBoxes] = createSignal<
    RevisionMarkupBox[]
  >([]);
  const [selectedImageBox, setSelectedImageBox] =
    createSignal<SelectedImageSelectionBox | null>(null);
  const [selectedTextBoxBox, setSelectedTextBoxBox] =
    createSignal<SelectedTextBoxSelectionBox | null>(null);
  const [selectedTableBox, setSelectedTableBox] =
    createSignal<SelectedTableBox | null>(null);
  const [caretBox, setCaretBox] = createSignal<CaretBox>({
    left: 0,
    top: 0,
    height: 28,
    visible: false,
  });
  const [preferredColumnX, setPreferredColumnX] = createSignal<number | null>(
    null,
  );
  const stabilize = createLayoutIdentityStabilizer();
  // Display for Review: final/original modes render a *resolved* document.
  // The raw revision marks stay untouched in the model; only the layout sees
  // the projection.
  const renderDocument = createMemo((): import("@/core/model.js").EditorDocument => {
    layoutMetricsEpoch();
    const mode = props.state.reviewDisplayMode ?? "all";
    if (mode === "all") {
      return props.state.document;
    }
    return projectTrackedRevisions(props.state.document, mode).document;
  });
  const documentLayout = createMemo((): EditorLayoutDocument => {
    layoutMetricsEpoch();
    return stabilize(
      projectDocumentLayout(
        renderDocument(),
        undefined,
        measuredBlockHeights(),
        measuredParagraphLayouts(),
        {
          measurer: canvasTextMeasurer,
        },
      ),
    );
  });
  const canvasSnapshotProvider = createCanvasLayoutSnapshotProvider();

  let syncRequestId = 0;

  const syncInputBox = (_reason: LayoutSyncReason = "selection"): void => {
    const surface = props.surfaceRef();
    if (!surface) {
      setSelectionBoxes([]);
      setCommentHighlights([]);
      setRevisionMarkupBoxes([]);
      setSelectedImageBox(null);
      setSelectedTextBoxBox(null);
      setSelectedTableBox(null);
      setCaretBox(
        (
          current,
        ): { visible: false; left: number; top: number; height: number } => ({
          ...current,
          visible: false,
        }),
      );
      return;
    }

    const snapshot = canvasSnapshotProvider.getCanvasLayoutSnapshot({
      surface,
      state: props.state,
      documentLayout: documentLayout(),
      zoomFactor: props.zoomFactor?.(),
    });
    if (!snapshot) {
      setSelectionBoxes([]);
      setCommentHighlights([]);
      setRevisionMarkupBoxes([]);
      setSelectedImageBox(null);
      setSelectedTextBoxBox(null);
      setSelectedTableBox(null);
      setCaretBox(
        (
          current,
        ): { visible: false; left: number; top: number; height: number } => ({
          ...current,
          visible: false,
        }),
      );
      return;
    }

    // In resolved (final/original) views the geometry of the raw document no
    // longer describes the painted document, so selection/caret overlays and
    // revision/comment decorations are hidden; the panel remains usable.
    if ((props.state.reviewDisplayMode ?? "all") !== "all") {
      setSelectionBoxes([]);
      setSelectedImageBox(null);
      setSelectedTextBoxBox(null);
      setSelectedTableBox(null);
      setCaretBox({ left: 0, top: 0, height: 28, visible: false });
      setInputBox({ left: 0, top: 0, height: 28 });
      setCommentHighlights([]);
      setRevisionMarkupBoxes([]);
      return;
    }

    const geometry = computeCanvasSelectionGeometry(snapshot, props.state);
    setSelectionBoxes(geometry.selectionBoxes);
    setRevisionMarkupBoxes(
      props.state.showRevisionMarkup === false
        ? []
        : computeRevisionMarkup(snapshot),
    );
    setCommentHighlights(computeCommentHighlights(snapshot, props.state));
    setSelectedImageBox(geometry.selectedImageBox);
    setSelectedTextBoxBox(geometry.selectedTextBoxBox);
    setSelectedTableBox(geometry.selectedTableBox);
    setInputBox(geometry.inputBox);
    setCaretBox(geometry.caretBox);
  };

  const requestInputBoxSync = (
    reason: LayoutSyncReason = "selection",
  ): void => {
    const requestId = ++syncRequestId;
    queueMicrotask((): void => {
      if (requestId !== syncRequestId) {
        return;
      }
      syncInputBox(reason);
    });
  };

  const syncMeasuredLayoutMetrics = (
    reason: LayoutSyncReason = "content-change",
  ): boolean => {
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
      setMeasuredParagraphLayouts(
        (current): Record<string, EditorLayoutParagraph> =>
          normalizeParagraphLayouts(current, options.paragraphIds ?? []),
      );
      bumpLayoutMetricsEpoch();
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
      bumpLayoutMetricsEpoch();
    } else if ((invalidation.dirtyParagraphIds?.length ?? 0) > 0) {
      const dirtyIds = invalidation.dirtyParagraphIds ?? [];
      setMeasuredParagraphLayouts(
        (current): Record<string, EditorLayoutParagraph> =>
          normalizeParagraphLayouts(current, dirtyIds),
      );
      bumpLayoutMetricsEpoch();
    }

    requestInputBoxSync("content-change");
  };

  const stabilizeLayoutAfterImport = async (): Promise<void> => {
    setMeasuredBlockHeights({});
    setMeasuredParagraphLayouts({});
    bumpLayoutMetricsEpoch();

    await new Promise<void>((resolve): void => {
      scheduleFrame((): void => resolve());
    });

    requestInputBoxSync("import");
  };

  createEffect((): void => {
    props.state.selection.anchor.paragraphId;
    props.state.selection.anchor.runId;
    props.state.selection.anchor.offset;
    props.state.selection.focus.paragraphId;
    props.state.selection.focus.runId;
    props.state.selection.focus.offset;
    requestInputBoxSync("selection");
  });

  createEffect((): void => {
    props.state.document;
    props.state.activeSectionIndex;
    props.state.activeZone;
    if (props.isImporting?.()) {
      return;
    }
    requestInputBoxSync("content-change");
  });

  // The markup toggle is a view flag: flip the overlay without an edit.
  createEffect((): void => {
    props.state.showRevisionMarkup;
    requestInputBoxSync("content-change");
  });

  // Display for Review re-projects the document; flip layout with the mode.
  createEffect((): void => {
    props.state.reviewDisplayMode;
    requestInputBoxSync("content-change");
  });

  createEffect((): void => {
    const viewport = props.viewportRef();
    if (!viewport) {
      return;
    }

    const handleViewportScroll = (): void => {
      requestInputBoxSync("scroll");
    };
    const handleWindowResize = (): void => {
      requestInputBoxSync("resize");
    };

    viewport.addEventListener("scroll", handleViewportScroll, {
      passive: true,
    });
    window.addEventListener("resize", handleWindowResize);

    onCleanup((): void => {
      viewport.removeEventListener("scroll", handleViewportScroll);
      window.removeEventListener("resize", handleWindowResize);
    });
  });

  const clearPreferredColumn = (): null => setPreferredColumnX(null);

  const onCleanupHook = (): void => {
    syncRequestId += 1;
    canvasSnapshotProvider.clear();
  };

  return {
    measuredBlockHeights,
    measuredParagraphLayouts,
    documentLayout,
    canvasSnapshotProvider,
    inputBox,
    selectionBoxes,
    commentHighlights,
    revisionMarkupBoxes,
    selectedImageBox,
    selectedTextBoxBox,
    selectedTableBox,
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
