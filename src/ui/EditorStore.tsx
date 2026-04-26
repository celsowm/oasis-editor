import { createStore } from 'solid-js/store';
import { EditorViewModel } from '../app/presenters/OasisEditorPresenter.js';

// Initial dummy state to avoid null checks everywhere
const initialViewModel: Partial<EditorViewModel> = {
    selectionState: {
        bold: false,
        italic: false,
        underline: false,
        strike: false,
        link: null,
        color: '#000000',
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
}>({
    view: initialViewModel as EditorViewModel,
    events: null
});

export { store, setStore };
