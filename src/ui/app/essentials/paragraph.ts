import { MERGE_KEYS } from "@/core/transactionMergeKeys.js";
import { setParagraphStyle } from "@/core/commands/block.js";
import type { EditorBorderStyle, EditorState } from "@/core/model.js";
import type { EssentialsParagraphCapability } from "@/plugins/internal/essentialsCapabilities.js";
import type { CreateEditorEssentialsPluginOptions } from "./types.js";

export function buildEssentialsParagraph(
  options: CreateEditorEssentialsPluginOptions,
): EssentialsParagraphCapability {
  return {
    togglePageBreakBefore: (): void =>
      options.commandsController.toggleParagraphFlagCommand("pageBreakBefore"),
    toggleKeepWithNext: (): void =>
      options.commandsController.toggleParagraphFlagCommand("keepWithNext"),
    setSpacingAfter: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "spacingAfter",
        value,
      ),
    setSpacingBefore: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "spacingBefore",
        value,
      ),
    setIndentLeft: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentLeft",
        value,
      ),
    setIndentRight: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentRight",
        value,
      ),
    setIndentFirstLine: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentFirstLine",
        value,
      ),
    setIndentHanging: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "indentHanging",
        value,
      ),
    setSpecialIndent: (
      kind: "none" | "firstLine" | "hanging",
      value?: number | null,
    ): void => {
      const resolvedValue = value ?? 48;
      options.applyTransactionalState(
        (current): EditorState => {
          let next = setParagraphStyle(current, "indentFirstLine", null);
          next = setParagraphStyle(next, "indentHanging", null);
          if (kind === "firstLine") {
            next = setParagraphStyle(next, "indentFirstLine", resolvedValue);
          } else if (kind === "hanging") {
            next = setParagraphStyle(next, "indentHanging", resolvedValue);
          }
          return next;
        },
        { mergeKey: MERGE_KEYS.specialIndent },
      );
      options.focusInput();
    },
    setShading: (value: string | null): void =>
      options.commandsController.applyParagraphStyleCommand("shading", value),
    applyBorders: (): void => {
      const border: EditorBorderStyle = {
        width: 1,
        type: "solid",
        color: "#000000",
      };
      options.applyTransactionalState(
        (current): EditorState => {
          let next = setParagraphStyle(current, "borderTop", border);
          next = setParagraphStyle(next, "borderRight", border);
          next = setParagraphStyle(next, "borderBottom", border);
          next = setParagraphStyle(next, "borderLeft", border);
          return next;
        },
        { mergeKey: MERGE_KEYS.paraBorders },
      );
      options.focusInput();
    },
    setLineHeight: (value: number | null): void =>
      options.commandsController.applyParagraphStyleCommand(
        "lineHeight",
        value,
      ),
    setListFormat: (format: string): void =>
      options.commandsController.handleListFormatChange(
        format as Parameters<
          typeof options.commandsController.handleListFormatChange
        >[0],
      ),
    setListStartAt: (value: number | null): void =>
      options.commandsController.handleListStartAtChange(value),
    outdent: (): undefined =>
      void options.commandsController.handleListTab("outdent"),
    indent: (): undefined =>
      void options.commandsController.handleListTab("indent"),
  };
}
