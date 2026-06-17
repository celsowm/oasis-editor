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

/**
 * Inputs needed to assemble the editor's view-prop bundles. These are already
 * built controllers, accessors and handlers owned by the composition root; this
 * module performs only the (logic-free) shaping into the prop objects consumed
 * by `OasisEditorEditor` and the composed shells.
 */
export interface EditorViewPropsContext {
  // layout
  viewportHeight: number | string | undefined;
  className: string | undefined;
  style: JSX.CSSProperties | undefined;
  // overlays
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
  // refs
  focusController: ReturnType<typeof createEditorFocusController>;
  // file handlers
  handleImportFile: (file: File | null) => void;
  handleInsertImage: (file: File | null) => void;
  // surface handlers
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
  // input handlers
  textInput: ReturnType<typeof createEditorTextInput>;
  setFocused: (value: boolean) => void;
  handleCopy: OasisEditorEditorInputHandlers["onCopy"];
  handleCut: OasisEditorEditorInputHandlers["onCut"];
  handlePaste: OasisEditorEditorInputHandlers["onPaste"];
  handleKeyDown: OasisEditorEditorInputHandlers["onKeyDown"];
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
  const layout: OasisEditorEditorLayoutProps = {
    viewportHeight: ctx.viewportHeight,
    class: ctx.className,
    style: ctx.style,
  };

  const overlays: OasisEditorEditorOverlayProps = {
    selectionBoxes: ctx.selectionBoxes,
    commentHighlights: ctx.commentHighlights,
    selectedImageBox: ctx.selectedImageBox,
    selectedTextBoxBox: ctx.selectedTextBoxBox,
    layoutOptions: ctx.layoutOptions,
    caretBox: ctx.caretBox,
    inputBox: ctx.inputBox,
    hoveredRevision: ctx.hoveredRevision,
    focused: ctx.focused,
    showCaret: ctx.showCaret,
    importProgress: ctx.importProgress,
  };

  const refs: OasisEditorEditorRefProps = {
    onViewportRef: (element) => {
      ctx.focusController.viewportRef = element;
    },
    onSurfaceRef: (element) => {
      ctx.focusController.surfaceRef = element;
    },
    onTextareaRef: (element) => {
      ctx.focusController.textareaRef = element;
    },
    onImportInputRef: (element) => {
      ctx.focusController.importInputRef = element;
    },
    onImageInputRef: (element) => {
      ctx.focusController.imageInputRef = element;
    },
  };

  const fileHandlers: OasisEditorEditorFileHandlers = {
    onImportInputChange: (e) =>
      ctx.handleImportFile(e.currentTarget.files?.[0] ?? null),
    onImageInputChange: (e) =>
      ctx.handleInsertImage(e.currentTarget.files?.[0] ?? null),
  };

  const surfaceHandlers: OasisEditorEditorSurfaceHandlers = {
    onDragOver: (event) => event.preventDefault(),
    onDrop: ctx.handleDrop,
    onEditorMouseDown: ctx.onEditorMouseDown,
    onSurfaceMouseDown: ctx.surfaceEvents.handleSurfaceMouseDown,
    onSurfaceClick: ctx.surfaceEvents.handleSurfaceClick,
    onSurfaceMouseMove: ctx.tableResize.handleMouseMove,
    onSurfaceDblClick: ctx.surfaceEvents.handleSurfaceDblClick,
    onParagraphMouseDown: ctx.surfaceEvents.handleParagraphMouseDown,
    onImageMouseDown: ctx.handleImageMouseDown,
    onImageResizeHandleMouseDown: ctx.handleImageResizeHandleMouseDown,
    onTextBoxResizeHandleMouseDown: ctx.handleTextBoxResizeHandleMouseDown,
    onImageRotateHandleMouseDown: ctx.handleImageRotateHandleMouseDown,
    onTextBoxRotateHandleMouseDown: ctx.handleTextBoxRotateHandleMouseDown,
    onTableDragHandleMouseDown: ctx.tableDrag.handleMouseDown,
    onRevisionMouseEnter: ctx.revisionController.handleRevisionMouseEnter,
    onRevisionMouseLeave: ctx.revisionController.handleRevisionMouseLeave,
    onEditorContextMenu: (event) => ctx.handleEditorContextMenu(event),
  };

  const inputHandlers: OasisEditorEditorInputHandlers = {
    onInputBlur: () => ctx.setFocused(false),
    onInputFocus: () => ctx.setFocused(true),
    onCompositionEnd: ctx.textInput.handleCompositionEnd,
    onCompositionStart: ctx.textInput.handleCompositionStart,
    onCopy: ctx.handleCopy,
    onCut: ctx.handleCut,
    onInput: ctx.textInput.handleTextInput,
    onKeyDown: ctx.handleKeyDown,
    onPaste: ctx.handlePaste,
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
