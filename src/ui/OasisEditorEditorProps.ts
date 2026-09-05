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
  remoteWebFonts?: boolean;
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
  onEditorPointerDown: (event: PointerEvent) => void;
  onSurfacePointerDown: (event: PointerEvent) => void;
  onSurfaceClick?: (event: MouseEvent) => void;
  onSurfacePointerMove?: (event: PointerEvent) => void;
  onSurfaceDblClick: (event: MouseEvent) => void;
  onParagraphPointerDown: (
    paragraphId: string,
    event: PointerEvent & { currentTarget: HTMLParagraphElement },
  ) => void;
  onImagePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageResizeHandlePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxResizeHandlePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageRotateHandlePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageCropHandlePointerDown?: (
    paragraphId: string,
    paragraphOffset: number,
    direction: ResizeHandleDirection,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onImageCropBodyPointerDown?: (
    paragraphId: string,
    paragraphOffset: number,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onTextBoxRotateHandlePointerDown: (
    paragraphId: string,
    paragraphOffset: number,
    event: PointerEvent & { currentTarget: HTMLElement },
  ) => void;
  onTableDragHandlePointerDown: (tableId: string, event: PointerEvent) => void;
  onTableCornerResizeHandlePointerDown: (
    tableId: string,
    event: PointerEvent,
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
  onCompositionUpdate: (
    event: CompositionEvent & { currentTarget: HTMLTextAreaElement },
  ) => void;
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
