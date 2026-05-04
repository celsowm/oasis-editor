import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { OasisEditorApp } from "../../ui/OasisEditorApp.js";
import { setupOasisEditorDom } from "./oasisEditorTestHarness.js";
import type { EditorState } from "../../core/model.js";

describe("ToolbarModernization Safety Net", () => {
  let currentState: EditorState;

  beforeEach(() => {
    setupOasisEditorDom();
  });

  function renderEditor() {
    const root = document.getElementById("oasis-editor-root") as HTMLElement;
    const dispose = render(() => OasisEditorApp({ 
      onStateChange: (s) => currentState = s 
    }), root);
    // Force one tick to ensure createEffect runs and populates currentState
    return { root, dispose };
  }

  const tableTestIds = [
    "editor-toolbar-merge-table",
    "editor-toolbar-split-table",
    "editor-toolbar-table-shading",
    "editor-toolbar-table-borders",
    "editor-toolbar-table-no-borders",
    "editor-toolbar-table-width-100",
    "editor-toolbar-insert-table-column-before",
    "editor-toolbar-insert-table-column-after",
    "editor-toolbar-delete-table-column",
    "editor-toolbar-insert-table-row-before",
    "editor-toolbar-insert-table-row-after",
    "editor-toolbar-delete-table-row",
  ];

  const staticTestIds = [
    "editor-toolbar-file-dropdown",
    "editor-toolbar-undo",
    "editor-toolbar-redo",
    "editor-toolbar-insert-dropdown",
    "editor-toolbar-style",
    "editor-toolbar-font-family",
    "editor-toolbar-font-size",
    "editor-toolbar-color",
    "editor-toolbar-highlight",
    "editor-toolbar-bold",
    "editor-toolbar-italic",
    "editor-toolbar-underline",
    "editor-toolbar-strike",
    "editor-toolbar-superscript",
    "editor-toolbar-subscript",
    "editor-toolbar-link",
    "editor-toolbar-unlink",
    "editor-toolbar-align-left",
    "editor-toolbar-align-center",
    "editor-toolbar-align-right",
    "editor-toolbar-align-justify",
    "editor-toolbar-list-bullet",
    "editor-toolbar-list-ordered",
    "editor-toolbar-list-format",
    "editor-toolbar-list-start-at",
    "editor-toolbar-orientation",
    "editor-toolbar-margins",
    "editor-toolbar-section-break-next",
    "editor-toolbar-section-break-continuous",
    "editor-toolbar-review-dropdown",
    "editor-toolbar-page-break-before",
    "editor-toolbar-keep-with-next",
    "editor-toolbar-line-height",
    "editor-toolbar-spacing-before",
    "editor-toolbar-spacing-after",
    "editor-toolbar-indent-left",
    "editor-toolbar-indent-first-line",
    "editor-toolbar-indent-hanging",
    "editor-toolbar-paragraph-shading",
    "editor-toolbar-paragraph-borders",
  ];

  it("verifies that all toolbar elements exist in the current UI (context-aware)", async () => {
    const { root, dispose } = renderEditor();

    // Check static elements
    for (const testId of staticTestIds) {
      const element = root.querySelector(`[data-testid="${testId}"]`);
      expect(element, `Static element with testId "${testId}" should exist`).not.toBeNull();
    }

    // Check table elements are hidden initially
    for (const testId of tableTestIds) {
      const element = root.querySelector(`[data-testid="${testId}"]`);
      expect(element, `Table element with testId "${testId}" should be hidden initially`).toBeNull();
    }

    // Check dropdown content is hidden initially
    expect(root.querySelector('[data-testid="editor-toolbar-export-docx"]')).toBeNull();

    // Open File dropdown
    (root.querySelector('[data-testid="editor-toolbar-file-dropdown"]') as HTMLElement).click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('[data-testid="editor-toolbar-export-docx"]')).not.toBeNull();

    // Insert table to trigger context
    const insertDropdown = root.querySelector('[data-testid="editor-toolbar-insert-dropdown"]') as HTMLElement;
    insertDropdown.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    
    const insertTableButton = document.querySelector('[data-testid="editor-toolbar-insert-table"]') as HTMLElement;
    insertTableButton.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    // Check table elements now exist
    for (const testId of tableTestIds) {
      const element = root.querySelector(`[data-testid="${testId}"]`);
      expect(element, `Table element with testId "${testId}" should exist after inserting table`).not.toBeNull();
    }

    dispose();
  });

  it("verifies that boolean formatting buttons (Bold, Italic, etc.) toggle state", async () => {
    const { root, dispose } = renderEditor();
    const input = root.querySelector('[data-testid="editor-input"]') as HTMLTextAreaElement;

    // Type some text
    input.value = "H";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "H", inputType: "insertText" }));
    await Promise.resolve();
    
    // Select the character we just typed using Shift+ArrowLeft
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    const boldButton = root.querySelector('[data-testid="editor-toolbar-bold"]') as HTMLElement;
    boldButton.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    // Check if the state reflects bold
    const block = currentState.document.blocks[0] as any;
    expect(block.runs.some((r: any) => r.styles?.bold)).toBe(true);

    boldButton.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    expect((currentState.document.blocks[0] as any).runs[0].styles?.bold).not.toBe(true);

    dispose();
  });

  it("verifies that paragraph metric inputs trigger state changes", async () => {
    const { root, dispose } = renderEditor();
    await Promise.resolve(); // Wait for initial state

    const lineHeightInput = root.querySelector('[data-testid="editor-toolbar-line-height"]') as HTMLInputElement;
    lineHeightInput.value = "2.5";
    lineHeightInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect((currentState.document.blocks[0] as any).style?.lineHeight).toBe(2.5);

    const indentInput = root.querySelector('[data-testid="editor-toolbar-indent-left"]') as HTMLInputElement;
    indentInput.value = "36";
    indentInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect((currentState.document.blocks[0] as any).style?.indentLeft).toBe(36);

    dispose();
  });

  it("verifies table context: table buttons appear and enable correctly", async () => {
    const { root, dispose } = renderEditor();
    await Promise.resolve(); // Wait for initial state

    // Initially table group should be hidden
    let mergeButton = root.querySelector('[data-testid="editor-toolbar-merge-table"]') as HTMLButtonElement;
    expect(mergeButton).toBeNull();

    // Open Insert dropdown
    (root.querySelector('[data-testid="editor-toolbar-insert-dropdown"]') as HTMLElement).click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    // Insert table
    const insertTableButton = document.querySelector('[data-testid="editor-toolbar-insert-table"]') as HTMLElement;
    insertTableButton.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    // Now table group should be visible
    mergeButton = root.querySelector('[data-testid="editor-toolbar-merge-table"]') as HTMLButtonElement;
    expect(mergeButton).not.toBeNull();
    
    const tableBordersButton = root.querySelector('[data-testid="editor-toolbar-table-borders"]') as HTMLButtonElement;
    expect(tableBordersButton.disabled).toBe(false);

    dispose();
  });

  it("verifies track changes toggle", async () => {
    const { root, dispose } = renderEditor();
    await Promise.resolve(); // Wait for initial state

    // Open Review dropdown
    (root.querySelector('[data-testid="editor-toolbar-review-dropdown"]') as HTMLElement).click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    const trackButton = document.querySelector('[data-testid="editor-toolbar-track-changes"]') as HTMLElement;
    // trackChangesEnabled is undefined by default, which is falsy
    expect(!!currentState?.trackChangesEnabled).toBe(false);

    trackButton.click();
    await Promise.resolve();
    expect(currentState?.trackChangesEnabled).toBe(true);

    dispose();
  });
});

