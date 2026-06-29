import { createSignal } from "solid-js";
import type { EditorDocument, EditorState } from "@/core/model.js";
import {
  createEditorStateFromDocument,
  createInitialEditorState,
} from "@/core/editorState.js";
import { cloneEditorState } from "@/core/cloneState.js";

export function createEditorAppState(options: {
  initialDocument?: EditorDocument;
  initialState?: EditorState;
}) {
  const initialEditorState = options.initialState
    ? cloneEditorState(options.initialState)
    : options.initialDocument
      ? createEditorStateFromDocument(options.initialDocument)
      : createInitialEditorState();

  let stateSnapshot: EditorState = initialEditorState;
  const [stateAccessor, setStateSignal] =
    createSignal<EditorState>(initialEditorState);

  const state = new Proxy({} as EditorState, {
    get(_, prop): any {
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
    ownKeys(_) {
      const current = stateAccessor() as unknown;
      if (
        current === null ||
        (typeof current !== "object" && typeof current !== "function")
      ) {
        return [];
      }
      return Reflect.ownKeys(current as object);
    },
    getOwnPropertyDescriptor(_, prop) {
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

  const commitState = (next: EditorState): void => {
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
