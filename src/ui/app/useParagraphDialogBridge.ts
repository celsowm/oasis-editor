import { setParagraphStyle } from "@/core/editorCommands.js";
import type { EditorBorderStyle, EditorState } from "@/core/model.js";
import type {
  ParagraphDialogApplyValues,
  ParagraphDialogInitialValues,
} from "@/ui/components/Dialogs/ParagraphDialog.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";

interface ParagraphDialogState {
  isOpen: boolean;
  initial: ParagraphDialogInitialValues;
}

export interface ParagraphDialogBridgeDeps {
  toolbarStyleState: () => ToolbarStyleState;
  isReadOnly: () => boolean;
  setParagraphDialog: (state: ParagraphDialogState) => void;
  setContextMenu: (state: { isOpen: boolean; x: number; y: number }) => void;
  clearPreferredColumn: () => void;
  resetTransactionGrouping: () => void;
  applyTransactionalState: (
    producer: (current: EditorState) => EditorState,
    options?: { mergeKey?: string },
  ) => void;
  focusInput: () => void;
}

function createInitialValues(
  styleState: ToolbarStyleState,
): ParagraphDialogInitialValues {
  return {
    align: styleState.align ?? "",
    indentLeft: styleState.indentLeft ?? "",
    indentRight: styleState.indentRight ?? "",
    indentFirstLine: styleState.indentFirstLine ?? "",
    indentHanging: styleState.indentHanging ?? "",
    spacingBefore: styleState.spacingBefore ?? "",
    spacingAfter: styleState.spacingAfter ?? "",
    lineHeight: styleState.lineHeight ?? "",
    shading: styleState.shading ?? "",
    borderStyle: styleState.borderStyle ?? "",
    borderWidth: styleState.borderWidth ?? "",
    borderColor: styleState.borderColor ?? "",
    borderSideTop: styleState.borderSideTop ?? false,
    borderSideRight: styleState.borderSideRight ?? false,
    borderSideBottom: styleState.borderSideBottom ?? false,
    borderSideLeft: styleState.borderSideLeft ?? false,
  };
}

export function createParagraphDialogBridge(deps: ParagraphDialogBridgeDeps) {
  const openParagraphDialog = () => {
    deps.setParagraphDialog({
      isOpen: true,
      initial: createInitialValues(deps.toolbarStyleState()),
    });
    deps.setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const applyParagraphDialogValues = (
    values: ParagraphDialogApplyValues,
    original: ParagraphDialogInitialValues,
  ) => {
    if (deps.isReadOnly()) return;

    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    const originalNumber = (value: string): number | null => {
      if (value.trim() === "") return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    deps.applyTransactionalState(
      (current) => {
        let next = current;
        if (values.align !== (original.align || null)) {
          next = setParagraphStyle(next, "align", values.align);
        }
        if (values.indentLeft !== originalNumber(original.indentLeft)) {
          next = setParagraphStyle(next, "indentLeft", values.indentLeft);
        }
        if (values.indentRight !== originalNumber(original.indentRight)) {
          next = setParagraphStyle(next, "indentRight", values.indentRight);
        }
        if (
          values.indentFirstLine !== originalNumber(original.indentFirstLine)
        ) {
          next = setParagraphStyle(
            next,
            "indentFirstLine",
            values.indentFirstLine,
          );
        }
        if (values.indentHanging !== originalNumber(original.indentHanging)) {
          next = setParagraphStyle(next, "indentHanging", values.indentHanging);
        }
        if (values.spacingBefore !== originalNumber(original.spacingBefore)) {
          next = setParagraphStyle(next, "spacingBefore", values.spacingBefore);
        }
        if (values.spacingAfter !== originalNumber(original.spacingAfter)) {
          next = setParagraphStyle(next, "spacingAfter", values.spacingAfter);
        }
        if (values.lineHeight !== originalNumber(original.lineHeight)) {
          next = setParagraphStyle(next, "lineHeight", values.lineHeight);
        }
        if (values.shading !== (original.shading || null)) {
          next = setParagraphStyle(next, "shading", values.shading);
        }

        const originalShared: EditorBorderStyle | null =
          original.borderStyle === "solid" ||
          original.borderStyle === "dashed" ||
          original.borderStyle === "dotted"
            ? {
                type: original.borderStyle,
                width: Number(original.borderWidth) || 0,
                color: original.borderColor || "#000000",
              }
            : null;
        const originalBorders = {
          borderTop: original.borderSideTop ? originalShared : null,
          borderRight: original.borderSideRight ? originalShared : null,
          borderBottom: original.borderSideBottom ? originalShared : null,
          borderLeft: original.borderSideLeft ? originalShared : null,
        } as const;
        const nextBorders = {
          borderTop: values.borders.top,
          borderRight: values.borders.right,
          borderBottom: values.borders.bottom,
          borderLeft: values.borders.left,
        } as const;
        for (const edge of [
          "borderTop",
          "borderRight",
          "borderBottom",
          "borderLeft",
        ] as const) {
          if (
            JSON.stringify(nextBorders[edge]) !==
            JSON.stringify(originalBorders[edge])
          ) {
            next = setParagraphStyle(next, edge, nextBorders[edge]);
          }
        }
        return next;
      },
      { mergeKey: "paragraph-dialog" },
    );

    deps.focusInput();
  };

  return {
    openParagraphDialog,
    applyParagraphDialogValues,
  };
}
