import { EditorState } from "./EditorState.js";

export class StateStore {
  private state: EditorState;
  private listeners = new Set<(state: EditorState) => void>();

  constructor(initialState: EditorState) {
    this.state = initialState;
  }

  getState(): EditorState {
    return this.state;
  }

  setState(nextState: EditorState): void {
    if (this.state === nextState) return;
    this.state = nextState;
    this.notify();
  }

  subscribe(listener: (state: EditorState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
