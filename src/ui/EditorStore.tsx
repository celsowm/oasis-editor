import { createStore } from "solid-js/store";
import { LayoutState } from "../core/layout/LayoutTypes.js";

export interface EditorState {
  layout: LayoutState | null;
  editingMode: "main" | "header" | "footer" | "footnote";
}

const [store, setStore] = createStore<EditorState>({
  layout: null,
  editingMode: "main",
});

export const editorStore = store;

export const setEditorLayout = (layout: LayoutState) => {
  setStore("layout", layout);
};

export const setEditingMode = (mode: EditorState["editingMode"]) => {
  setStore("editingMode", mode);
};
