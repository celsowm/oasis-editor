import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";
import { createEditorStateFromParagraphRuns } from "@/core/editorState.js";
import { createEditorStyleController } from "@/app/controllers/useEditorStyle.js";

describe("pending caret underline", () => {
  it("overrides an inherited variant with single underline or no underline without changing content", () => {
    const state = createEditorStateFromParagraphRuns(
      [
        [
          {
            text: "Text",
            styles: { underline: true, underlineStyle: "double" },
          },
        ],
      ],
      {
        anchor: { blockIndex: 0, offset: 2 },
        focus: { blockIndex: 0, offset: 2 },
      },
    );
    const before = JSON.stringify(state);
    createRoot((dispose) => {
      const apply = vi.fn();
      const controller = createEditorStyleController({
        state: () => state,
        commandsController: () =>
          ({ applyUnderlineStyleCommand: apply }) as never,
        clearPreferredColumn: vi.fn(),
        resetTransactionGrouping: vi.fn(),
        focusInput: vi.fn(),
        logger: { info: vi.fn() },
      });
      expect(controller.toolbarStyleState().underlineStyle).toBe("double");
      controller.applyToolbarUnderlineStyleCommand("single");
      expect(controller.pendingCaretTextStyle()).toEqual({
        underline: true,
        underlineStyle: null,
      });
      expect(controller.toolbarStyleState().underlineStyle).toBe("");
      expect(controller.toolbarStyleState().underline).toBe(true);
      controller.applyToolbarUnderlineStyleCommand(null);
      expect(controller.pendingCaretTextStyle()).toEqual({
        underline: false,
        underlineStyle: null,
      });
      expect(controller.toolbarStyleState().underlineStyle).toBe("");
      expect(controller.toolbarStyleState().underline).toBe(false);
      expect(apply).not.toHaveBeenCalled();
      expect(JSON.stringify(state)).toBe(before);
      dispose();
    });
  });
});
