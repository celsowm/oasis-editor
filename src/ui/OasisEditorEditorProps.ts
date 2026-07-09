import type { Accessor, JSX } from "solid-js";
import type {
  EditorLayoutDocument,
  EditorLayoutParagraph,
  EditorState,
} from "@/core/model.js";
import type { ImportProgressState } from "@/app/controllers/useEditorDocumentIO.js";
import type { ToolbarHost } from "./components/Toolbar/state/createToolbarApi.js";
import type {
  CaretBox,
  CommentHighlightBox,
  InputBox,
  LayoutOptionsOverlay,
  RevisionBox,
  SelectedImageBox,
  SelectedTextBoxBox,
  SelectedTableBox,
  SelectionBox,
} from "./editorUiTypes.js";
import type { ResizeHandleDirection } from "./resizeGeometry.js";

type ImportProgress = ImportProgressState;

export interface OasisEditorEditorLayoutProps {
  documentLayout: Accessor<EditorLayoutDocument>;
  measuredBlockHeights?: Accessor<Record<string, number>>;
  measuredParagraphLayouts?: Accessor<Record<string, EditorLayoutParagraph>>;
  viewportHeight?: number | string;
  class?: string;
  style?: JSX.CSSProperties;
  readOnly?: boolean;
  showHorizontalRuler?: boolean;
  // Lifted zoom state (owned by OasisEditorApp). When absent the editor falls
  // back to a local signal so it still works when rendered standalone.
  zoomPercent?: Accessor<number>;
  setZoomPercent?: (value: number) => void;
  zoomFactor?: Accessor<number>;
}

export interface OasisEditorEditorOverlayProps {
  selectionBoxes: Accessor<SelectionBox[]>;
  commentHighlights: Accessor<CommentHighlightBox[]>;
  selectedImageBox: Accessor<SelectedImageBox | null>;
  selectedTextBoxBox: Accessor<SelectedTextBoxBox | null>;
  selectedTableBox: Accessor<SelectedTableBox | null>;
  caretBox: Accessor<CaretBox>;
  inputBox: Accessor<InputBox>;
  hoveredRevision: Accessor<RevisionBox | null>;
  focused: Accessor<boolean>;
  showCaret: Accessor<boolean>;
  importProgress?: Accessor<ImportProgress | null>;
  /** Whether interactive image crop mode is active (shows crop handles). */
  imageCropMode?: Accessor<boolean>;
  toolbarHost?: () => ToolbarHost;
  persistenceStatus?: () => string;
  showFloatingTableToolbar?: Accessor<boolean>;
  layoutOptions?: LayoutOptionsOverlay;
}

export interface OasisEditorEditorRefProps {
  onViewportRef?: (element: HTMLDivElement) => void;
  onSurfaceRef?: (element: HTMLDivElement) => void;
  onTextareaRef?: (element: HTMLTextAreaElement) => void;
  onImportInputRef?: (element: HTMLInputElement) => void;
  onImageInputRef?: (element: HTMLInputElement) => void;
}

export interface OasisEditorEditorSurfaceHandlers {
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onEditorMouseDown: (event: MouseEvent) => void;
  onSurfaceMouseDown: (event: MouseEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfaceMouseMove?: (event: MouseEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphMouseDown: (
    paragraphId: string,
    event: MouseEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImageMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxResizeHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageRotateHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageCropHandleMouseDown?: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxRotateHandleMouseDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: MouseEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandleMouseDown: (tableId: string, event: MouseEvent) => void;
  onTableCornerResizeHandleMouseDown: (
    tableId: string,
    event: MouseEvent,
  ) => void;
  onRevisionMouseEnter: (revisionId: string, event: MouseEvent) => void;
  onRevisionMouseLeave?: (revisionId: string, event: MouseEvent) => void;
  onEditorContextMenu?: (event: MouseEvent) => void;
}

export interface OasisEditorEditorInputHandlers {
  onInputBlur: () => void;
  onInputFocus: () => void;
  onCompositionEnd: (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onCompositionStart: () => void;
  onCopy: (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onCut: (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onInput: (event: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  onKeyDown: (
    event: KeyboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
  onPaste: (
    event: ClipboardEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
}

export interface OasisEditorEditorFileHandlers {
  onImportInputChange: (
    event: Event & { currentTarget: HTMLInputElement },
  ) => void;
  onImageInputChange: (
    event: Event & { currentTarget: HTMLInputElement },
  ) => void;
}

export interface OasisEditorEditorProps {
  state: Accessor<EditorState>;
  layout: OasisEditorEditorLayoutProps;
  overlays: OasisEditorEditorOverlayProps;
  refs?: OasisEditorEditorRefProps;
  surfaceHandlers: OasisEditorEditorSurfaceHandlers;
  inputHandlers: OasisEditorEditorInputHandlers;
  fileHandlers: OasisEditorEditorFileHandlers;
}
