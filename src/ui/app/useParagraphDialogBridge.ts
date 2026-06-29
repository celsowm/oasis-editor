import { MERGE_KEYS, type MergeKey } from "@/core/transactionMergeKeys.js";
import { setParagraphStyle } from "@/core/commands/block.js";
import { resolveDefaultParagraphStyleId } from "@/core/model.js";
import type {
  EditorBorderStyle,
  EditorParagraphStyle,
  EditorState,
} from "@/core/model.js";
import type {
  ParagraphDialogApplyValues,
  ParagraphDialogInitialValues,
} from "@/ui/components/Dialogs/ParagraphDialog.js";
import type { ToolbarStyleState } from "@/ui/toolbarStyleState.js";

/** Materialize the dialog values onto a base paragraph style (set-as-default). */
function applyValuesToParagraphStyle(
  base: EditorParagraphStyle,
  values: ParagraphDialogApplyValues,
): EditorParagraphStyle {
  const next = { ...base } as Record<string, unknown>;
  const setOrDelete = (key: string, value: unknown): void => {
    if (value === null || value === undefined) delete next[key];
    else next[key] = value;
  };
  setOrDelete("align", values.align);
  setOrDelete("indentLeft", values.indentLeft);
  setOrDelete("indentRight", values.indentRight);
  setOrDelete("indentFirstLine", values.indentFirstLine);
  setOrDelete("indentHanging", values.indentHanging);
  next.mirrorIndents = values.mirrorIndents;
  setOrDelete("spacingBefore", values.spacingBefore);
  setOrDelete("spacingAfter", values.spacingAfter);
  setOrDelete("lineHeight", values.lineHeight);
  setOrDelete("lineRule", values.lineRule);
  next.contextualSpacing = values.contextualSpacing;
  setOrDelete("outlineLevel", values.outlineLevel);
  setOrDelete("shading", values.shading);
  setOrDelete("borderTop", values.borders.top);
  setOrDelete("borderRight", values.borders.right);
  setOrDelete("borderBottom", values.borders.bottom);
  setOrDelete("borderLeft", values.borders.left);
  next.pageBreakBefore = values.pageBreakBefore;
  next.keepWithNext = values.keepWithNext;
  next.keepLinesTogether = values.keepLinesTogether;
  next.widowControl = values.widowControl;
  setOrDelete("tabs", values.tabs.length > 0 ? values.tabs : null);
  return next as EditorParagraphStyle;
}

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
    options?: { mergeKey?: MergeKey },
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
    mirrorIndents: styleState.mirrorIndents ?? false,
    spacingBefore: styleState.spacingBefore ?? "",
    spacingAfter: styleState.spacingAfter ?? "",
    lineHeight: styleState.lineHeight ?? "",
    lineRule: styleState.lineRule ?? "",
    contextualSpacing: styleState.contextualSpacing ?? false,
    outlineLevel: styleState.outlineLevel ?? "",
    shading: styleState.shading ?? "",
    borderStyle: styleState.borderStyle ?? "",
    borderWidth: styleState.borderWidth ?? "",
    borderColor: styleState.borderColor ?? "",
    borderSideTop: styleState.borderSideTop ?? false,
    borderSideRight: styleState.borderSideRight ?? false,
    borderSideBottom: styleState.borderSideBottom ?? false,
    borderSideLeft: styleState.borderSideLeft ?? false,
    pageBreakBefore: styleState.pageBreakBefore ?? false,
    keepWithNext: styleState.keepWithNext ?? false,
    keepLinesTogether: styleState.keepLinesTogether ?? false,
    widowControl: styleState.widowControl ?? true,
    tabs: styleState.tabs ?? [],
  };
}

export function createParagraphDialogBridge(deps: ParagraphDialogBridgeDeps) {
  const openParagraphDialog = (): void => {
    deps.setParagraphDialog({
      isOpen: true,
      initial: createInitialValues(deps.toolbarStyleState()),
    });
    deps.setContextMenu({ isOpen: false, x: 0, y: 0 });
  };

  const applyParagraphDialogValues = (
    values: ParagraphDialogApplyValues,
    original: ParagraphDialogInitialValues,
  ): void => {
    if (deps.isReadOnly()) return;

    deps.clearPreferredColumn();
    deps.resetTransactionGrouping();

    const originalNumber = (value: string): number | null => {
      if (value.trim() === "") return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    };

    deps.applyTransactionalState(
      (current): EditorState => {
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
        const originalRule = (original.lineRule ||
          null) as ParagraphDialogApplyValues["lineRule"];
        if (values.lineRule !== originalRule) {
          next = setParagraphStyle(next, "lineRule", values.lineRule);
        }
        if (values.shading !== (original.shading || null)) {
          next = setParagraphStyle(next, "shading", values.shading);
        }
        if (values.mirrorIndents !== (original.mirrorIndents ?? false)) {
          next = setParagraphStyle(next, "mirrorIndents", values.mirrorIndents);
        }
        if (
          values.contextualSpacing !== (original.contextualSpacing ?? false)
        ) {
          next = setParagraphStyle(
            next,
            "contextualSpacing",
            values.contextualSpacing,
          );
        }
        const originalOutline =
          original.outlineLevel.trim() === ""
            ? null
            : Number(original.outlineLevel);
        if (values.outlineLevel !== originalOutline) {
          next = setParagraphStyle(next, "outlineLevel", values.outlineLevel);
        }
        if (values.pageBreakBefore !== (original.pageBreakBefore ?? false)) {
          next = setParagraphStyle(
            next,
            "pageBreakBefore",
            values.pageBreakBefore,
          );
        }
        if (values.keepWithNext !== (original.keepWithNext ?? false)) {
          next = setParagraphStyle(next, "keepWithNext", values.keepWithNext);
        }
        if (
          values.keepLinesTogether !== (original.keepLinesTogether ?? false)
        ) {
          next = setParagraphStyle(
            next,
            "keepLinesTogether",
            values.keepLinesTogether,
          );
        }
        if (values.widowControl !== (original.widowControl ?? true)) {
          next = setParagraphStyle(next, "widowControl", values.widowControl);
        }
        if (
          JSON.stringify(values.tabs) !== JSON.stringify(original.tabs ?? [])
        ) {
          next = setParagraphStyle(
            next,
            "tabs",
            values.tabs.length > 0 ? values.tabs : null,
          );
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
      { mergeKey: MERGE_KEYS.paragraphDialog },
    );

    deps.focusInput();
  };

  const setParagraphDialogDefault = (
    values: ParagraphDialogApplyValues,
  ): void => {
    if (deps.isReadOnly()) return;
    deps.resetTransactionGrouping();
    deps.applyTransactionalState((current): EditorState => {
      const styles = current.document.styles;
      const defaultId = resolveDefaultParagraphStyleId(styles);
      if (!defaultId || !styles?.[defaultId]) return current;
      const target = styles[defaultId];
      return {
        ...current,
        document: {
          ...current.document,
          styles: {
            ...styles,
            [defaultId]: {
              ...target,
              paragraphStyle: applyValuesToParagraphStyle(
                target.paragraphStyle ?? {},
                values,
              ),
            },
          },
        },
      };
    });
    deps.focusInput();
  };

  return {
    openParagraphDialog,
    applyParagraphDialogValues,
    setParagraphDialogDefault,
  };
}
