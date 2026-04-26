import { describe, it, expect } from "vitest";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { Operations } from "../core/operations/OperationFactory.js";
import { createDocument } from "../core/document/DocumentFactory.js";

describe("Track Changes", () => {
  it("should toggle track changes mode", () => {
    const runtime = new DocumentRuntime();
    expect(runtime.getState().trackChangesEnabled).toBeFalsy();

    runtime.dispatch(Operations.toggleTrackChanges());
    expect(runtime.getState().trackChangesEnabled).toBe(true);

    runtime.dispatch(Operations.toggleTrackChanges());
    expect(runtime.getState().trackChangesEnabled).toBe(false);
  });

  it("should mark inserted text as revision when track changes is on", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.appendParagraph("hello"));
    // Move selection to the new paragraph
    const stateBefore = runtime.getState();
    const newBlock = stateBefore.document.sections[0].children[stateBefore.document.sections[0].children.length - 1];
    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: stateBefore.document.sections[0].id, blockId: newBlock.id, inlineId: (newBlock as any).children[0].id, offset: 0 },
      focus: { sectionId: stateBefore.document.sections[0].id, blockId: newBlock.id, inlineId: (newBlock as any).children[0].id, offset: 0 },
    }));
    runtime.dispatch(Operations.toggleTrackChanges());
    runtime.dispatch(Operations.insertText(" world"));

    const state = runtime.getState();
    const block = state.document.sections[0].children[state.document.sections[0].children.length - 1];
    const runs = (block as any).children;
    const insertRun = runs.find((r: any) => r.text === " world");
    expect(insertRun).toBeDefined();
    expect(insertRun.revision).toBeDefined();
    expect(insertRun.revision.type).toBe("insert");
  });

  it("should accept an insertion revision", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.appendParagraph("hello"));
    const stateBefore = runtime.getState();
    const newBlock = stateBefore.document.sections[0].children[stateBefore.document.sections[0].children.length - 1];
    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: stateBefore.document.sections[0].id, blockId: newBlock.id, inlineId: (newBlock as any).children[0].id, offset: 0 },
      focus: { sectionId: stateBefore.document.sections[0].id, blockId: newBlock.id, inlineId: (newBlock as any).children[0].id, offset: 0 },
    }));
    runtime.dispatch(Operations.toggleTrackChanges());
    runtime.dispatch(Operations.insertText(" world"));

    let state = runtime.getState();
    const block = state.document.sections[0].children[state.document.sections[0].children.length - 1];
    const runs = (block as any).children;
    const insertRun = runs.find((r: any) => r.text === " world");
    expect(insertRun).toBeDefined();

    runtime.dispatch(Operations.acceptRevision(insertRun.id));
    state = runtime.getState();
    const updatedBlock = state.document.sections[0].children[state.document.sections[0].children.length - 1];
    const updatedRuns = (updatedBlock as any).children;
    const acceptedRun = updatedRuns.find((r: any) => r.text === " world");
    expect(acceptedRun).toBeDefined();
    expect(acceptedRun.revision).toBeUndefined();
  });

  it("should reject an insertion revision", () => {
    const runtime = new DocumentRuntime();
    runtime.dispatch(Operations.appendParagraph("hello"));
    const stateBefore = runtime.getState();
    const newBlock = stateBefore.document.sections[0].children[stateBefore.document.sections[0].children.length - 1];
    runtime.dispatch(Operations.setSelection({
      anchor: { sectionId: stateBefore.document.sections[0].id, blockId: newBlock.id, inlineId: (newBlock as any).children[0].id, offset: 0 },
      focus: { sectionId: stateBefore.document.sections[0].id, blockId: newBlock.id, inlineId: (newBlock as any).children[0].id, offset: 0 },
    }));
    runtime.dispatch(Operations.toggleTrackChanges());
    runtime.dispatch(Operations.insertText(" world"));

    let state = runtime.getState();
    const block = state.document.sections[0].children[state.document.sections[0].children.length - 1];
    const runs = (block as any).children;
    const insertRun = runs.find((r: any) => r.text === " world");
    expect(insertRun).toBeDefined();

    runtime.dispatch(Operations.rejectRevision(insertRun.id));
    state = runtime.getState();
    const updatedBlock = state.document.sections[0].children[state.document.sections[0].children.length - 1];
    const updatedRuns = (updatedBlock as any).children;
    const rejectedRun = updatedRuns.find((r: any) => r.text === " world");
    expect(rejectedRun).toBeUndefined();
  });
});
