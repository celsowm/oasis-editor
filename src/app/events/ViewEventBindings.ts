export interface KeyboardEvents {
  onTextInput: (text: string) => void;
  onDelete: () => void;
  onEnter: (isShift: boolean) => void;
  onEscape: () => void;
  onArrowKey: (key: string) => void;
}

export interface MouseEvents {
  onMouseDown: (e: MouseEvent) => void;
  onMouseMove: (e: MouseEvent) => void;
  onMouseUp: (e: MouseEvent) => void;
  onDblClick?: (e: MouseEvent) => void;
  onTripleClick?: (e: MouseEvent) => void;
}

export interface FormattingEvents {
  onFormatPainterToggle: () => void;
  onFormatPainterDoubleClick: () => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
  onStrikethrough: () => void;
  onSuperscript: () => void;
  onSubscript: () => void;
  onColorChange: (color: string) => void;
  onFontFamilyChange: (fontFamily: string) => void;
  onAlign: (align: "left" | "center" | "right" | "justify") => void;
  onStyleChange: (styleId: string) => void;
}

export interface CommandEvents {
  onUndo: () => void;
  onRedo: () => void;
  onTemplateChange: (templateId: string) => void;
  onPrint?: () => void;
  onExportDocx?: () => void;
  onExportPdf?: () => void;
  onInsertPageBreak?: () => void;
  onToggleTrackChanges: () => void;
}

export interface ListEvents {
  onToggleBullets: () => void;
  onToggleNumberedList: () => void;
  onDecreaseIndent: () => void;
  onIncreaseIndent: () => void;
}

export interface ImageEvents {
  onInsertImage: (src: string, naturalWidth: number, naturalHeight: number, displayWidth: number) => void;
  onImportDocx: (file: File) => void;
  onResizeImage: (blockId: string, width: number, height: number) => void;
  onSelectImage: (blockId: string) => void;
  onUpdateImageAlt: (blockId: string, alt: string) => void;
  onDragOver?: (event: DragEvent) => void;
  onDrop?: (event: DragEvent) => void;
  onImageDragStart?: (blockId: string, event: DragEvent) => void;
}

export interface LinkEvents {
  onInsertLink: (url: string) => void;
  onRemoveLink: () => void;
}

export interface TableEvents {
  onInsertTable: (rows: number, cols: number) => void;
  onTableAction: (action: string, tableId: string) => void;
  onTableMove: (tableId: string, targetBlockId: string, isBefore: boolean) => void;
}

export interface FieldEvents {
  onInsertPageNumber: () => void;
  onInsertNumPages: () => void;
  onInsertDate: () => void;
  onInsertTime: () => void;
  onInsertEquation?: (latex: string, display: boolean) => void;
  onInsertBookmark?: (name: string) => void;
  onInsertFootnote?: () => void;
  onInsertEndnote?: () => void;
  onInsertComment?: (text: string) => void;
}

// Combined type for backward compatibility
export type ViewEventBindings = KeyboardEvents & MouseEvents & FormattingEvents & CommandEvents & ListEvents & ImageEvents & LinkEvents & TableEvents & FieldEvents;
