import { createSignal, type Setter } from "solid-js";
import {
  syncActiveSectionToSelection,
  type EditorDocument,
  type EditorState,
} from "@/core/model.js";
import {
  createEditorStateFromDocument,
  createInitialEditorState,
} from "@/core/editorState.js";
import { cloneEditorState } from "@/core/cloneState.js";

export function createEditorAppState(options: {
  initialDocument?: EditorDocument;
  initialState?: EditorState;
}): {
  state: EditorState;
  setStateSignal: Setter<EditorState>;
  commitState: (next: EditorState) => void;
  getStateSnapshot: () => EditorState;
} {
  const initialEditorState = options.initialState
    ? cloneEditorState(options.initialState)
    : options.initialDocument
      ? createEditorStateFromDocument(options.initialDocument)
      : createInitialEditorState();

  let stateSnapshot: EditorState = initialEditorState;
  const [stateAccessor, setStateSignal] =
    createSignal<EditorState>(initialEditorState);

  const state = new Proxy({} as EditorState, {
    get(_, prop): unknown {
      const current = stateAccessor() as unknown;
      if (
        current === null ||
        (typeof current !== "object" && typeof current !== "function")
      ) {
        return undefined;
      }
      return Reflect.get(current as object, prop);
    },
    has(_, prop): boolean {
      const current = stateAccessor() as unknown;
      if (
        current === null ||
        (typeof current !== "object" && typeof current !== "function")
      ) {
        return false;
      }
      return Reflect.has(current as object, prop);
    },
    ownKeys(_): (string | symbol)[] {
      const current = stateAccessor() as unknown;
      if (
        current === null ||
        (typeof current !== "object" && typeof current !== "function")
      ) {
        return [];
      }
      return Reflect.ownKeys(current as object);
    },
    getOwnPropertyDescriptor(_, prop): PropertyDescriptor | undefined {
      const current = stateAccessor() as unknown;
      if (
        current === null ||
        (typeof current !== "object" && typeof current !== "function")
      ) {
        return {
          configurable: true,
          enumerable: true,
        };
      }
      return {
        ...Reflect.getOwnPropertyDescriptor(current as object, prop),
        configurable: true,
        enumerable: true,
      };
    },
  });

  const commitState = (nextState: EditorState): void => {
    // `state` is a live proxy over the signal. A view-only command that returns
    // it unchanged (a no-op, e.g. restoring an already-default Show Markup
    // flag) must never be written back into the signal: the proxy's get trap
    // would then read from itself and recurse forever on the next property
    // access. Substitute the last committed real state instead.
    const source: EditorState = nextState === state ? stateSnapshot : nextState;
    const next = syncActiveSectionToSelection(source);
    stateSnapshot = next;
    setStateSignal(next);
  };

  return {
    state,
    setStateSignal,
    commitState,
    getStateSnapshot: (): EditorState => stateSnapshot,
  };
}
