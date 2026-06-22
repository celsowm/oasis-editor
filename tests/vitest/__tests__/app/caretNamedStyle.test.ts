import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { createEditorStateFromParagraphRuns } from "@/core/editorState.js";
import { createEditorStyleController } from "@/app/controllers/useEditorStyle.js";

describe("caret named character style", () => {
  it("stores styleId as pending text formatting for subsequent typing", () => {
    const state = createEditorStateFromParagraphRuns([[{ text: "Text" }]], {
      anchor: { blockIndex: 0, offset: 2 },
      focus: { blockIndex: 0, offset: 2 },
    });

    createRoot((dispose) => {
      const controller = createEditorStyleController({
        state: () => state,
        commandsController: () =>
          ({
            applyValueStyleCommand: vi.fn(),
            applyBooleanStyleCommand: vi.fn(),
          }) as never,
        clearPreferredColumn: vi.fn(),
        resetTransactionGrouping: vi.fn(),
        focusInput: vi.fn(),
        logger: { info: vi.fn() },
      });

      controller.applyToolbarValueStyleCommand("styleId", "Emphasis");
      expect(controller.pendingCaretTextStyle()).toMatchObject({
        styleId: "Emphasis",
      });
      expect(controller.toolbarStyleState().characterStyleId).toBe("Emphasis");
      dispose();
    });
  });
});
