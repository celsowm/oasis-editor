import type { Accessor, JSX } from "solid-js";
import type {
  CaretBox,
  CommentHighlightBox,
  InputBox,
  LayoutOptionsOverlay,
  RevisionBox,
  SelectedImageBox,
  SelectedTextBoxBox,
  SelectionBox,
} from "@/ui/editorUiTypes.js";
import type { EditorLayoutDocument } from "@/core/model.js";
import type {
  OasisEditorEditorFileHandlers,
  OasisEditorEditorInputHandlers,
  OasisEditorEditorLayoutProps,
  OasisEditorEditorOverlayProps,
  OasisEditorEditorRefProps,
  OasisEditorEditorSurfaceHandlers,
} from "@/ui/OasisEditorEditor.js";
import type { createEditorFocusController } from "./useEditorFocus.js";
import type { createEditorSurfaceEvents } from "@/app/controllers/useEditorSurfaceEvents.js";
import type { createEditorTableResize } from "@/app/controllers/useEditorTableResize.js";
import type { createEditorTableDrag } from "@/app/controllers/useEditorTableDrag.js";
import type { createEditorTextInput } from "@/app/controllers/useEditorTextInput.js";
import type { createEditorRevisionController } from "@/app/controllers/useEditorRevision.js";

type ImportProgress = NonNullable<
  ReturnType<NonNullable<OasisEditorEditorOverlayProps["importProgress"]>>
>;

/** Page sizing / zoom inputs that shape the layout prop bundle. */
export interface EditorViewLayoutInput {
  documentLayout: Accessor<EditorLayoutDocument>;
  viewportHeight: number | string | undefined;
  className: string | undefined;
  style: JSX.CSSProperties | undefined;
  zoomPercent: Accessor<number>;
  setZoomPercent: (value: number) => void;
  zoomFactor: Accessor<number>;
}

/** Overlay accessors (selection, caret, boxes, progress) for the overlay bundle. */
export interface EditorViewOverlayInput {
  selectionBoxes: Accessor<SelectionBox[]>;
  commentHighlights: Accessor<CommentHighlightBox[]>;
  selectedImageBox: Accessor<SelectedImageBox | null>;
  selectedTextBoxBox: Accessor<SelectedTextBoxBox | null>;
  layoutOptions: LayoutOptionsOverlay;
  caretBox: Accessor<CaretBox>;
  inputBox: Accessor<InputBox>;
  hoveredRevision: Accessor<RevisionBox | null>;
  focused: Accessor<boolean>;
  showCaret: Accessor<boolean>;
  importProgress: Accessor<ImportProgress | null>;
}

/** Owner of the editor element refs. */
export interface EditorViewRefsInput {
  focusController: ReturnType<typeof createEditorFocusController>;
}

/** File-input change handlers (import / insert image). */
export interface EditorViewFileInput {
  handleImportFile: (file: File | null) => void;
  handleInsertImage: (file: File | null) => void;
}

/** Pointer/gesture collaborators and handlers for the surface bundle. */
export interface EditorViewSurfaceInput {
  surfaceEvents: ReturnType<typeof createEditorSurfaceEvents>;
  tableResize: ReturnType<typeof createEditorTableResize>;
  tableDrag: ReturnType<typeof createEditorTableDrag>;
  revisionController: ReturnType<typeof createEditorRevisionController>;
  handleDrop: OasisEditorEditorSurfaceHandlers["onDrop"];
  onEditorMouseDown: OasisEditorEditorSurfaceHandlers["onEditorMouseDown"];
  handleImageMouseDown: OasisEditorEditorSurfaceHandlers["onImageMouseDown"];
  handleImageResizeHandleMouseDown: OasisEditorEditorSurfaceHandlers["onImageResizeHandleMouseDown"];
  handleTextBoxResizeHandleMouseDown: OasisEditorEditorSurfaceHandlers["onTextBoxResizeHandleMouseDown"];
  handleImageRotateHandleMouseDown: OasisEditorEditorSurfaceHandlers["onImageRotateHandleMouseDown"];
  handleTextBoxRotateHandleMouseDown: OasisEditorEditorSurfaceHandlers["onTextBoxRotateHandleMouseDown"];
  handleEditorContextMenu: (event: MouseEvent) => void;
}

/** Text-input / clipboard / keyboard handlers for the input bundle. */
export interface EditorViewInputInput {
  textInput: ReturnType<typeof createEditorTextInput>;
  setFocused: (value: boolean) => void;
  handleCopy: OasisEditorEditorInputHandlers["onCopy"];
  handleCut: OasisEditorEditorInputHandlers["onCut"];
  handlePaste: OasisEditorEditorInputHandlers["onPaste"];
  handleKeyDown: OasisEditorEditorInputHandlers["onKeyDown"];
}

/**
 * Inputs needed to assemble the editor's view-prop bundles, grouped by the
 * capability they feed. These are already built controllers, accessors and
 * handlers owned by the composition root; this module performs only the
 * (logic-free) shaping into the prop objects consumed by `OasisEditorEditor`
 * and the composed shells (I1).
 */
export interface EditorViewPropsContext {
  layout: EditorViewLayoutInput;
  overlays: EditorViewOverlayInput;
  refs: EditorViewRefsInput;
  surface: EditorViewSurfaceInput;
  input: EditorViewInputInput;
  files: EditorViewFileInput;
}

export interface EditorViewProps {
  layout: OasisEditorEditorLayoutProps;
  overlays: OasisEditorEditorOverlayProps;
  refs: OasisEditorEditorRefProps;
  surfaceHandlers: OasisEditorEditorSurfaceHandlers;
  inputHandlers: OasisEditorEditorInputHandlers;
  fileHandlers: OasisEditorEditorFileHandlers;
}

export function buildEditorViewProps(
  ctx: EditorViewPropsContext,
): EditorViewProps {
  const {
    layout: layoutInput,
    overlays: overlayInput,
    refs: refsInput,
    surface,
    input,
    files,
  } = ctx;

  const layout: OasisEditorEditorLayoutProps = {
    documentLayout: layoutInput.documentLayout,
    viewportHeight: layoutInput.viewportHeight,
    class: layoutInput.className,
    style: layoutInput.style,
    zoomPercent: layoutInput.zoomPercent,
    setZoomPercent: layoutInput.setZoomPercent,
    zoomFactor: layoutInput.zoomFactor,
  };

  const overlays: OasisEditorEditorOverlayProps = {
    selectionBoxes: overlayInput.selectionBoxes,
    commentHighlights: overlayInput.commentHighlights,
    selectedImageBox: overlayInput.selectedImageBox,
    selectedTextBoxBox: overlayInput.selectedTextBoxBox,
    layoutOptions: overlayInput.layoutOptions,
    caretBox: overlayInput.caretBox,
    inputBox: overlayInput.inputBox,
    hoveredRevision: overlayInput.hoveredRevision,
    focused: overlayInput.focused,
    showCaret: overlayInput.showCaret,
    importProgress: overlayInput.importProgress,
  };

  const refs: OasisEditorEditorRefProps = {
    onViewportRef: (element): void => {
      refsInput.focusController.viewportRef = element;
    },
    onSurfaceRef: (element): void => {
      refsInput.focusController.surfaceRef = element;
    },
    onTextareaRef: (element): void => {
      refsInput.focusController.textareaRef = element;
    },
    onImportInputRef: (element): void => {
      refsInput.focusController.importInputRef = element;
    },
    onImageInputRef: (element): void => {
      refsInput.focusController.imageInputRef = element;
    },
  };

  const fileHandlers: OasisEditorEditorFileHandlers = {
    onImportInputChange: (e): void =>
      files.handleImportFile(e.currentTarget.files?.[0] ?? null),
    onImageInputChange: (e): void =>
      files.handleInsertImage(e.currentTarget.files?.[0] ?? null),
  };

  const surfaceHandlers: OasisEditorEditorSurfaceHandlers = {
    onDragOver: (event): void => event.preventDefault(),
    onDrop: surface.handleDrop,
    onEditorMouseDown: surface.onEditorMouseDown,
    onSurfaceMouseDown: surface.surfaceEvents.handleSurfaceMouseDown,
    onSurfaceClick: surface.surfaceEvents.handleSurfaceClick,
    onSurfaceMouseMove: surface.tableResize.handleMouseMove,
    onSurfaceDblClick: surface.surfaceEvents.handleSurfaceDblClick,
    onParagraphMouseDown: surface.surfaceEvents.handleParagraphMouseDown,
    onImageMouseDown: surface.handleImageMouseDown,
    onImageResizeHandleMouseDown: surface.handleImageResizeHandleMouseDown,
    onTextBoxResizeHandleMouseDown: surface.handleTextBoxResizeHandleMouseDown,
    onImageRotateHandleMouseDown: surface.handleImageRotateHandleMouseDown,
    onTextBoxRotateHandleMouseDown: surface.handleTextBoxRotateHandleMouseDown,
    onTableDragHandleMouseDown: surface.tableDrag.handleMouseDown,
    onRevisionMouseEnter: surface.revisionController.handleRevisionMouseEnter,
    onRevisionMouseLeave: surface.revisionController.handleRevisionMouseLeave,
    onEditorContextMenu: (event): void => surface.handleEditorContextMenu(event),
  };

  const inputHandlers: OasisEditorEditorInputHandlers = {
    onInputBlur: (): void => input.setFocused(false),
    onInputFocus: (): void => input.setFocused(true),
    onCompositionEnd: input.textInput.handleCompositionEnd,
    onCompositionStart: input.textInput.handleCompositionStart,
    onCopy: input.handleCopy,
    onCut: input.handleCut,
    onInput: input.textInput.handleTextInput,
    onKeyDown: input.handleKeyDown,
    onPaste: input.handlePaste,
  };

  return {
    layout,
    overlays,
    refs,
    surfaceHandlers,
    inputHandlers,
    fileHandlers,
  };
}
