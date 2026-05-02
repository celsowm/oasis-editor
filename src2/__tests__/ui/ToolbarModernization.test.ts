import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { OasisEditor2App } from "../../ui/OasisEditor2App.js";
import { setupOasisEditor2Dom } from "./oasisEditor2TestHarness.js";
import type { Editor2State } from "../../core/model.js";

describe("ToolbarModernization Safety Net", () => {
  let currentState: Editor2State;

  beforeEach(() => {
    setupOasisEditor2Dom();
  });

  function renderEditor() {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const dispose = render(() => OasisEditor2App({ 
      onStateChange: (s) => currentState = s 
    }), root);
    // Force one tick to ensure createEffect runs and populates currentState
    return { root, dispose };
  }

  const tableTestIds = [
    "editor-2-toolbar-merge-table",
    "editor-2-toolbar-split-table",
    "editor-2-toolbar-table-shading",
    "editor-2-toolbar-table-borders",
    "editor-2-toolbar-table-no-borders",
    "editor-2-toolbar-table-width-100",
    "editor-2-toolbar-insert-table-column-before",
    "editor-2-toolbar-insert-table-column-after",
    "editor-2-toolbar-delete-table-column",
    "editor-2-toolbar-insert-table-row-before",
    "editor-2-toolbar-insert-table-row-after",
    "editor-2-toolbar-delete-table-row",
  ];

  const staticTestIds = [
    "editor-2-toolbar-file-dropdown",
    "editor-2-toolbar-undo",
    "editor-2-toolbar-redo",
    "editor-2-toolbar-insert-dropdown",
    "editor-2-toolbar-style",
    "editor-2-toolbar-font-family",
    "editor-2-toolbar-font-size",
    "editor-2-toolbar-color",
    "editor-2-toolbar-highlight",
    "editor-2-toolbar-bold",
    "editor-2-toolbar-italic",
    "editor-2-toolbar-underline",
    "editor-2-toolbar-strike",
    "editor-2-toolbar-superscript",
    "editor-2-toolbar-subscript",
    "editor-2-toolbar-link",
    "editor-2-toolbar-unlink",
    "editor-2-toolbar-align-left",
    "editor-2-toolbar-align-center",
    "editor-2-toolbar-align-right",
    "editor-2-toolbar-align-justify",
    "editor-2-toolbar-list-bullet",
    "editor-2-toolbar-list-ordered",
    "editor-2-toolbar-list-format",
    "editor-2-toolbar-list-start-at",
    "editor-2-toolbar-orientation",
    "editor-2-toolbar-margins",
    "editor-2-toolbar-section-break-next",
    "editor-2-toolbar-section-break-continuous",
    "editor-2-toolbar-review-dropdown",
    "editor-2-toolbar-page-break-before",
    "editor-2-toolbar-keep-with-next",
    "editor-2-toolbar-line-height",
    "editor-2-toolbar-spacing-before",
    "editor-2-toolbar-spacing-after",
    "editor-2-toolbar-indent-left",
    "editor-2-toolbar-indent-first-line",
    "editor-2-toolbar-indent-hanging",
    "editor-2-toolbar-paragraph-shading",
    "editor-2-toolbar-paragraph-borders",
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
    expect(root.querySelector('[data-testid="editor-2-toolbar-export-docx"]')).toBeNull();

    // Open File dropdown
    (root.querySelector('[data-testid="editor-2-toolbar-file-dropdown"]') as HTMLElement).click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    expect(document.querySelector('[data-testid="editor-2-toolbar-export-docx"]')).not.toBeNull();

    // Insert table to trigger context
    const insertDropdown = root.querySelector('[data-testid="editor-2-toolbar-insert-dropdown"]') as HTMLElement;
    insertDropdown.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));
    
    const insertTableButton = document.querySelector('[data-testid="editor-2-toolbar-insert-table"]') as HTMLElement;
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
    const input = root.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement;

    // Type some text
    input.value = "H";
    input.dispatchEvent(new InputEvent("input", { bubbles: true, data: "H", inputType: "insertText" }));
    await Promise.resolve();
    
    // Select the character we just typed using Shift+ArrowLeft
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowLeft", shiftKey: true }));
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    const boldButton = root.querySelector('[data-testid="editor-2-toolbar-bold"]') as HTMLElement;
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

    const lineHeightInput = root.querySelector('[data-testid="editor-2-toolbar-line-height"]') as HTMLInputElement;
    lineHeightInput.value = "2.5";
    lineHeightInput.dispatchEvent(new Event("change", { bubbles: true }));
    await Promise.resolve();

    expect((currentState.document.blocks[0] as any).style?.lineHeight).toBe(2.5);

    const indentInput = root.querySelector('[data-testid="editor-2-toolbar-indent-left"]') as HTMLInputElement;
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
    let mergeButton = root.querySelector('[data-testid="editor-2-toolbar-merge-table"]') as HTMLButtonElement;
    expect(mergeButton).toBeNull();

    // Open Insert dropdown
    (root.querySelector('[data-testid="editor-2-toolbar-insert-dropdown"]') as HTMLElement).click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    // Insert table
    const insertTableButton = document.querySelector('[data-testid="editor-2-toolbar-insert-table"]') as HTMLElement;
    insertTableButton.click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    // Now table group should be visible
    mergeButton = root.querySelector('[data-testid="editor-2-toolbar-merge-table"]') as HTMLButtonElement;
    expect(mergeButton).not.toBeNull();
    
    const tableBordersButton = root.querySelector('[data-testid="editor-2-toolbar-table-borders"]') as HTMLButtonElement;
    expect(tableBordersButton.disabled).toBe(false);

    dispose();
  });

  it("verifies track changes toggle", async () => {
    const { root, dispose } = renderEditor();
    await Promise.resolve(); // Wait for initial state

    // Open Review dropdown
    (root.querySelector('[data-testid="editor-2-toolbar-review-dropdown"]') as HTMLElement).click();
    await Promise.resolve();
    await new Promise(r => setTimeout(r, 0));

    const trackButton = document.querySelector('[data-testid="editor-2-toolbar-track-changes"]') as HTMLElement;
    // trackChangesEnabled is undefined by default, which is falsy
    expect(!!currentState?.trackChangesEnabled).toBe(false);

    trackButton.click();
    await Promise.resolve();
    expect(currentState?.trackChangesEnabled).toBe(true);

    dispose();
  });
});

