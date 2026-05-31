import { describe, expect, it, vi } from "vitest";
import {
  createEditorDocument,
  createEditorParagraph,
  createEditorStateFromDocument,
} from "../../core/editorState.js";
import { collectFootnoteReferences } from "../../core/footnotes.js";
import { paragraphOffsetToPosition, type EditorState } from "../../core/model.js";
import { createEditorCommandsController } from "../../app/controllers/EditorCommandsController.js";
import { EditorCommandRegistry, defaultEditorKeyBindings } from "../../app/controllers/EditorCommandRegistry.js";
import { defaultMenuItems } from "../../ui/components/Menubar/defaultMenuItems.js";

function createControllerHarness(initialState: EditorState) {
  let state = initialState;
  const focusInput = vi.fn();
  const controller = createEditorCommandsController({
    get state() {
      return state;
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } as any,
    applyState: (next) => {
      state = next;
    },
    applyTransactionalState: (producer) => {
      state = producer(state);
    },
    applySelectionAwareTextCommand: (command) => {
      state = command(state);
    },
    applySelectionAwareParagraphCommand: (command) => {
      state = command(state);
    },
    applyTableAwareParagraphEdit: (current, edit) => edit(current),
    focusInput,
    clearPreferredColumn: vi.fn(),
    resetTransactionGrouping: vi.fn(),
    toolbarStyleState: () => ({}) as any,
    selectionCollapsed: () => true,
    selectedImageRun: () => null,
    openLinkDialog: vi.fn(),
    openImageAltDialog: vi.fn(),
  });

  return {
    controller,
    focusInput,
    state: () => state,
  };
}

describe("footnote UI commands", () => {
  it("inserts a footnote through the shared toolbar/menu command", () => {
    const paragraph = createEditorParagraph("Body text");
    const initial = {
      ...createEditorStateFromDocument(createEditorDocument([paragraph])),
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, 4),
        focus: paragraphOffsetToPosition(paragraph, 4),
      },
    };
    const harness = createControllerHarness(initial);

    harness.controller.applyInsertFootnoteCommand();

    expect(collectFootnoteReferences(harness.state().document)).toHaveLength(1);
    expect(harness.state().activeZone).toBe("footnote");
    expect(harness.focusInput).toHaveBeenCalled();
  });

  it("keeps insertion restricted to the main editing zone", () => {
    const paragraph = createEditorParagraph("Body text");
    const initial = {
      ...createEditorStateFromDocument(createEditorDocument([paragraph])),
      activeZone: "footnote" as const,
      activeFootnoteId: "footnote:missing",
    };
    const harness = createControllerHarness(initial);

    expect(harness.controller.canInsertFootnoteCommand()).toBe(false);
    harness.controller.applyInsertFootnoteCommand();

    expect(collectFootnoteReferences(harness.state().document)).toHaveLength(0);
    expect(harness.state()).toBe(initial);
    expect(harness.focusInput).not.toHaveBeenCalled();
  });

  it("registers Ctrl+Alt+F as the insert footnote shortcut", () => {
    const registry = new EditorCommandRegistry();
    defaultEditorKeyBindings.forEach((binding) => registry.register(binding));
    const applyInsertFootnoteCommand = vi.fn();
    const event = {
      key: "f",
      ctrlKey: true,
      metaKey: false,
      altKey: true,
      shiftKey: false,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;

    const handled = registry.execute(event, {
      commandsController: {
        applyInsertFootnoteCommand,
      },
    } as any);

    expect(handled).toBe(true);
    expect(applyInsertFootnoteCommand).toHaveBeenCalledOnce();
    expect(event.preventDefault).toHaveBeenCalledOnce();
  });

  it("exposes footnote insertion in the Insert menu", () => {
    const item = defaultMenuItems.find((candidate) => candidate.id === "insert_footnote");

    expect(item?.path).toBe("Insert/Footnote");
    expect(item?.labelKey).toBe("toolbar.footnote");
    expect(item?.shortcut).toBe("Ctrl+Alt+F");
    expect(item?.action).toBeTypeOf("function");
  });
});
