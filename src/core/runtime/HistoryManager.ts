import { EditorState } from "./EditorState.js";

export class HistoryManager {
  private history: EditorState[] = [];
  private future: EditorState[] = [];

  push(state: EditorState): void {
    this.history.push(state);
    this.future = [];
    if (this.history.length > 100) {
      this.history.shift(); // Limite de 100 níveis
    }
  }

  undo(currentState: EditorState): EditorState | null {
    const previous = this.history.pop();
    if (!previous) return null;
    this.future.unshift(currentState);
    return previous;
  }

  redo(currentState: EditorState): EditorState | null {
    const next = this.future.shift();
    if (!next) return null;
    this.history.push(currentState);
    return next;
  }
}
