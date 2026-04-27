import { createStore } from 'solid-js/store';
import { EditorViewModel } from '../app/presenters/OasisEditorPresenter.js';
import { LayoutState } from '../core/layout/LayoutTypes.js';

/** Pixel-space caret rect computed by the layout engine */
export interface CaretRect {
  x: number;
  y: number;
  height: number;
  pageId: string;
}

/** Pixel-space selection rect computed by the layout engine */
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  pageId: string;
}

// Initial dummy state to avoid null checks everywhere
const initialViewModel: Partial<EditorViewModel> = {
    selectionState: {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        link: null,
        color: '#000000',
        highlightColor: '',
        fontFamily: 'Inter',
        vertAlign: null,
        align: 'left',
        isListItem: false,
        isOrderedListItem: false,
        indentation: 0,
        trackChangesEnabled: false
    },
    metrics: {
        revision: '0',
        pages: '0',
        sections: '0',
        template: 'Default',
        backend: ''
    },
    status: 'Initializing...',
    editingMode: 'main',
    templateOptions: []
};

const [store, setStore] = createStore<{
    view: EditorViewModel | null;
    events: any | null;
    // Picker state shared via store instead of factory instances
    pickerColor: string;
    pickerHighlightColor: string;
    pickerTableRows: number;
    pickerTableCols: number;
    onColorSelected?: (color: string) => void;
    onHighlightSelected?: (color: string) => void;
    onTableSelected?: (rows: number, cols: number) => void;
    // Selection overlay data (pre-computed pixel rects)
    caretRect: CaretRect | null;
    selectionRects: SelectionRect[];
    // Page layer layout (replaces the PageLayer class wrapper)
    pageLayout: LayoutState | null;
    editingMode: "main" | "header" | "footer" | "footnote";
    // Table floating toolbar state
    activeTableId: string | null;
    activeTableRect: { x: number; y: number } | null;
}>({
    view: initialViewModel as EditorViewModel,
    events: null,
    pickerColor: '#000000',
    pickerHighlightColor: '',
    pickerTableRows: 3,
    pickerTableCols: 3,
    caretRect: null,
    selectionRects: [],
    pageLayout: null,
    editingMode: "main",
    activeTableId: null,
    activeTableRect: null,
});

export { store, setStore };
