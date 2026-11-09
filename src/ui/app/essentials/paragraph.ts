import { MERGE_KEYS } from "@/core/transactionMergeKeys.js";
import { setParagraphStyle } from "@/core/commands/block.js";
import {
  canMoveSelectedParagraphs,
  moveSelectedParagraphs,
} from "@/core/commands/paragraphMove.js";
import { sortSelectedParagraphs } from "@/core/commands/paragraphSort.js";
import { stepOutlineLevel } from "@/core/commands/outlineStep.js";
import { resetParagraphFormatting } from "@/core/commands/paragraphReset.js";
import { editParagraphTabStops } from "@/core/commands/paragraphTabs.js";
import { setParagraphOutlineLevel } from "@/core/commands/paragraphOutlineLevel.js";
import { setParagraphAlign } from "@/core/commands/paragraphAlign.js";
import { setParagraphListLevel } from "@/core/commands/paragraphListLevel.js";
import { setParagraphContextualSpacing } from "@/core/commands/paragraphContextualSpacing.js";
import { setParagraphMirrorIndents } from "@/core/commands/paragraphMirrorIndents.js";
import { setParagraphLineRule } from "@/core/commands/paragraphLineRule.js";
import { setParagraphTextDirection } from "@/core/commands/paragraphTextDirection.js";
import { setParagraphSuppressAutoHyphens } from "@/core/commands/paragraphSuppressAutoHyphens.js";
import { setParagraphKinsoku } from "@/core/commands/paragraphKinsoku.js";
import { setParagraphOverflowPunct } from "@/core/commands/paragraphOverflowPunct.js";
import { setParagraphWordWrap } from "@/core/commands/paragraphWordWrap.js";
import { setParagraphAutoSpaceDE } from "@/core/commands/paragraphAutoSpaceDE.js";
import { setParagraphAutoSpaceDN } from "@/core/commands/paragraphAutoSpaceDN.js";
import { setParagraphAdjustRightInd } from "@/core/commands/paragraphAdjustRightInd.js";
import { setParagraphTopLinePunct } from "@/core/commands/paragraphTopLinePunct.js";
import { setParagraphPageBreakBefore } from "@/core/commands/paragraphPageBreakBefore.js";
import { setParagraphKeepWithNext } from "@/core/commands/paragraphKeepWithNext.js";
import { setParagraphKeepLinesTogether } from "@/core/commands/paragraphKeepLinesTogether.js";
import { setParagraphWidowControl } from "@/core/commands/paragraphWidowControl.js";
import { applyHorizontalLine } from "@/core/commands/horizontalLine.js";
import { hasDropCap, setDropCap } from "@/core/commands/dropCap.js";
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
    toggleKeepLinesTogether: (): void =>
      options.commandsController.toggleParagraphFlagCommand(
        "keepLinesTogether",
      ),
    toggleWidowControl: (): void =>
      options.commandsController.toggleParagraphFlagCommand("widowControl"),
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
    setLineRule: (rule: "auto" | "exact" | "atLeast" | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphLineRule(current, rule),
      ),
    setTextDirection: (direction: string | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphTextDirection(
          current,
          direction as Parameters<typeof setParagraphTextDirection>[1],
        ),
      ),
    setSuppressAutoHyphens: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphSuppressAutoHyphens(current, value),
      ),
    setKinsoku: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphKinsoku(current, value),
      ),
    setOverflowPunct: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphOverflowPunct(current, value),
      ),
    setWordWrap: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphWordWrap(current, value),
      ),
    setAutoSpaceDE: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphAutoSpaceDE(current, value),
      ),
    setAutoSpaceDN: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphAutoSpaceDN(current, value),
      ),
    setAdjustRightInd: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphAdjustRightInd(current, value),
      ),
    setTopLinePunct: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphTopLinePunct(current, value),
      ),
    setPageBreakBefore: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphPageBreakBefore(current, value),
      ),
    setKeepWithNext: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphKeepWithNext(current, value),
      ),
    setKeepLinesTogether: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphKeepLinesTogether(current, value),
      ),
    setWidowControl: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphWidowControl(current, value),
      ),
    setContextualSpacing: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphContextualSpacing(current, value),
      ),
    setMirrorIndents: (value: boolean | null): void =>
      options.applyTransactionalState((current): EditorState =>
        setParagraphMirrorIndents(current, value),
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
    addHorizontalLine: (): void => {
      options.applyTransactionalState(
        (current): EditorState => applyHorizontalLine(current),
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
    setListLevel: (level: number): void => {
      options.applyTransactionalState((current): EditorState =>
        setParagraphListLevel(current, level),
      );
      options.focusInput();
    },
    outdent: (): undefined =>
      void options.commandsController.handleListTab("outdent"),
    indent: (): undefined =>
      void options.commandsController.handleListTab("indent"),
    moveParagraphsUp: (): void => {
      const current = options.state();
      if (!canMoveSelectedParagraphs(current, "up")) {
        options.focusInput();
        return;
      }
      options.applyTransactionalState(
        (c): EditorState => moveSelectedParagraphs(c, "up"),
        { mergeKey: MERGE_KEYS.paragraphMoveUp },
      );
      options.focusInput();
    },
    moveParagraphsDown: (): void => {
      const current = options.state();
      if (!canMoveSelectedParagraphs(current, "down")) {
        options.focusInput();
        return;
      }
      options.applyTransactionalState(
        (c): EditorState => moveSelectedParagraphs(c, "down"),
        { mergeKey: MERGE_KEYS.paragraphMoveDown },
      );
      options.focusInput();
    },
    canMoveParagraphsUp: (): boolean =>
      canMoveSelectedParagraphs(options.state(), "up"),
    canMoveParagraphsDown: (): boolean =>
      canMoveSelectedParagraphs(options.state(), "down"),
    promote: (): void => {
      options.applyTransactionalState((current): EditorState =>
        stepOutlineLevel(current, true),
      );
      options.focusInput();
    },
    demote: (): void => {
      options.applyTransactionalState((current): EditorState =>
        stepOutlineLevel(current, false),
      );
      options.focusInput();
    },
    resetParagraphFormatting: (): void => {
      options.applyTransactionalState((current): EditorState =>
        resetParagraphFormatting(current),
      );
      options.focusInput();
    },
    setTabStops: (change): void => {
      options.applyTransactionalState(
        (current): EditorState => editParagraphTabStops(current, change),
        { mergeKey: MERGE_KEYS.paragraphDialog },
      );
      options.focusInput();
    },
    setOutlineLevel: (level): void => {
      options.applyTransactionalState((current): EditorState =>
        setParagraphOutlineLevel(current, level),
      );
      options.focusInput();
    },
    setBidi: (enabled: boolean | null): void =>
      options.commandsController.applyParagraphStyleCommand("bidi", enabled),
    setParagraphAlign: (
      value: "left" | "center" | "right" | "justify" | null,
    ): void => {
      options.applyTransactionalState((current): EditorState =>
        setParagraphAlign(current, value),
      );
    },
    sortParagraphs: (descending = false): void =>
      options.applyTransactionalState((current): EditorState =>
        sortSelectedParagraphs(current, descending),
      ),
    hasDropCap: (): boolean => hasDropCap(options.state()),
    setDropCap: (payload): void => {
      options.applyTransactionalState((current): EditorState =>
        setDropCap(current, payload),
      );
      options.focusInput();
    },
  };
}
