import { describe, expect, it, vi } from "vitest";
import { createEditorKeyboardController } from "@/app/controllers/useEditorKeyboard.js";
import type { EditorKeyboardDeps } from "@/app/controllers/EditorKeyboardDeps.js";
import { createEditorStateFromTexts } from "@/core/editorState.js";
import { getParagraphs, getParagraphText, paragraphOffsetToPosition, type EditorState } from "@/core/model.js";

function harness(text: string, offset: number) {
  let state = createEditorStateFromTexts([text], { offset });
  const handleListTab = vi.fn(() => false);
  const focusInput = vi.fn();
  const deps = {
    state: () => state,
    isReadOnly: () => false,
    commandsController: { handleListTab },
    focusInput,
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    applyTransactionalState: (producer: (current: EditorState) => EditorState) => { state = producer(state); },
    applyTableAwareParagraphEdit: (current: EditorState, edit: (current: EditorState) => EditorState) => edit(current),
    resolveAdjacentTableCellPosition: vi.fn(() => null),
  } as unknown as EditorKeyboardDeps;
  const controller = createEditorKeyboardController(deps);
  function press(overrides: Partial<KeyboardEvent> = {}) {
    const event = {
      key: "Tab", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false,
      preventDefault: vi.fn(), currentTarget: { value: "" }, ...overrides,
    } as unknown as KeyboardEvent & { currentTarget: HTMLTextAreaElement };
    controller.handleKeyDown(event);
    return event;
  }
  return {
    press, handleListTab, focusInput,
    text: () => getParagraphText(getParagraphs(state)[0]),
    selectAll() {
      const p = getParagraphs(state)[0];
      state = { ...state, selection: { anchor: paragraphOffsetToPosition(p, 0), focus: paragraphOffsetToPosition(p, getParagraphText(p).length) } };
    },
  };
}

describe("document Tab typing", () => {
  it("inserts a real tab and retains editing focus", () => {
    const h = harness("abcd", 2);
    const e = h.press();
    expect(h.text()).toBe("ab\tcd");
    expect(e.preventDefault).toHaveBeenCalledOnce();
    expect(h.focusInput).toHaveBeenCalledOnce();
    expect(h.handleListTab).not.toHaveBeenCalled();
  });
  it("inserts a tab at an empty paragraph", () => {
    const h = harness("", 0);
    h.press();
    expect(h.text()).toBe("\t");
  });
  it("keeps list demotion at the item start", () => {
    const h = harness("item", 0);
    h.handleListTab.mockReturnValue(true);
    h.press();
    expect(h.handleListTab).toHaveBeenCalledWith("indent");
    expect(h.text()).toBe("item");
  });
  it("does not delete fully selected paragraph content", () => {
    const h = harness("keep", 0);
    h.selectAll();
    h.press();
    expect(h.text()).toBe("keep");
  });
  it("does not intercept browser Ctrl+Tab outside a table", () => {
    const h = harness("abcd", 2);
    const e = h.press({ctrlKey: true});
    expect(h.text()).toBe("abcd");
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
