// @ts-nocheck








import { describe, it, expect } from "vitest";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { Operations } from "../core/operations/OperationFactory.js";

describe("DocumentRuntime", () => {
  it("should manage document state", () => {
    const runtime = new DocumentRuntime();
    const initialState = runtime.getState();

    runtime.dispatch(Operations.insertText("Hello"));
    const nextState = runtime.getState();

    expect(nextState.document.revision).toBe(
      initialState.document.revision + 1,
    );
  });

  it("should support undo and redo", () => {
    const runtime = new DocumentRuntime();
    const initialState = runtime.getState();

    runtime.dispatch(Operations.insertText("A"));
    runtime.undo();
    expect(runtime.getState().document.revision).toBe(
      initialState.document.revision,
    );

    runtime.redo();
    expect(runtime.getState().document.revision).toBe(
      initialState.document.revision + 1,
    );
  });
});
