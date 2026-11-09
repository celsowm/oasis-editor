import type { OasisPlugin } from "@/core/plugin.js";
import type { EditorPageMargins, EditorPageNumbering } from "@/core/model.js";
import type { SectionPageNumberFormat } from "@/core/commands/pageNumber.js";
import { getColumnLayoutPreset } from "@/core/commands/pageSetup.js";
import type {
  ActionCommandBuilder,
  ValueCommandBuilder,
} from "../essentialsCommandBuilders.js";
import {
  numOrNull,
  boolOrNull,
  strOrNull,
} from "../essentialsCommandBuilders.js";
import type {
  EssentialsParagraphCapability,
  EssentialsSectionCapability,
  EssentialsStyleCapability,
} from "../essentialsCapabilities.js";

interface ParagraphAndSectionGroupDeps {
  style: EssentialsStyleCapability;
  paragraph: EssentialsParagraphCapability;
  section: EssentialsSectionCapability;
  valueCommand: ValueCommandBuilder;
  actionCommand: ActionCommandBuilder;
}

export function buildParagraphAndSectionCommands({
  style,
  paragraph,
  section,
  valueCommand,
  actionCommand,
}: ParagraphAndSectionGroupDeps): NonNullable<OasisPlugin["commands"]> {
  const s = style.state;
  return {
    outdent: actionCommand("outdent", (): void => paragraph.outdent()),
    indent: actionCommand("indent", (): void => paragraph.indent()),
    moveParagraphsUp: actionCommand(
      "moveParagraphsUp",
      (): void => paragraph.moveParagraphsUp(),
      (): { isEnabled: boolean } => ({
        isEnabled: paragraph.canMoveParagraphsUp(),
      }),
    ),
    moveParagraphsDown: actionCommand(
      "moveParagraphsDown",
      (): void => paragraph.moveParagraphsDown(),
      (): { isEnabled: boolean } => ({
        isEnabled: paragraph.canMoveParagraphsDown(),
      }),
    ),
    togglePageBreakBefore: actionCommand(
      "togglePageBreakBefore",
      (): void => paragraph.togglePageBreakBefore(),
      (): { isActive: boolean } => ({ isActive: Boolean(s().pageBreakBefore) }),
    ),
    toggleKeepWithNext: actionCommand(
      "toggleKeepWithNext",
      (): void => paragraph.toggleKeepWithNext(),
      (): { isActive: boolean } => ({ isActive: Boolean(s().keepWithNext) }),
    ),
    toggleKeepLinesTogether: actionCommand(
      "toggleKeepLinesTogether",
      (): void => paragraph.toggleKeepLinesTogether(),
      (): { isActive: boolean } => ({
        isActive: Boolean(s().keepLinesTogether),
      }),
    ),
    toggleWidowControl: actionCommand(
      "toggleWidowControl",
      (): void => paragraph.toggleWidowControl(),
      (): { isActive: boolean } => ({ isActive: Boolean(s().widowControl) }),
    ),
    toggleParagraphBidi: actionCommand(
      "toggleParagraphBidi",
      (): void => paragraph.setBidi(!s().bidi ? true : null),
      (): { isActive: boolean } => ({ isActive: Boolean(s().bidi) }),
    ),
    sortParagraphs: actionCommand("sortParagraphs", (p?: unknown): void =>
      paragraph.sortParagraphs(
        p === true ||
          p === "true" ||
          Boolean((p as { descending?: boolean })?.descending),
      ),
    ),
    promote: actionCommand("promote", (): void => paragraph.promote()),
    demote: actionCommand("demote", (): void => paragraph.demote()),
    resetParagraphFormatting: actionCommand(
      "resetParagraphFormatting",
      (): void => paragraph.resetParagraphFormatting(),
    ),
    setOutlineLevel: actionCommand(
      "setOutlineLevel",
      (p): void => {
        const payload = (p ?? undefined) as number | string | null | undefined;
        const level =
          payload === null ||
          payload === undefined ||
          payload === "body" ||
          payload === ""
            ? null
            : Number(payload);
        paragraph.setOutlineLevel(
          level === null || Number.isNaN(level) ? null : level,
        );
      },
      (): { value: number | null } => ({
        value: Number(style.state().outlineLevel) || null,
      }),
    ),
    setParagraphTabStops: actionCommand("setParagraphTabStops", (p): void => {
      const payload = (p ?? {}) as {
        tabs?: import("@/core/model.js").EditorTabStop[] | null;
        set?: import("@/core/model.js").EditorTabStop[];
        clear?: number[];
        clearAll?: boolean;
        default?: number | null;
      };
      paragraph.setTabStops({
        ...(payload.tabs !== undefined ? { tabs: payload.tabs } : {}),
        ...(payload.set !== undefined ? { set: payload.set } : {}),
        ...(payload.clear !== undefined ? { clear: payload.clear } : {}),
        ...(payload.clearAll !== undefined
          ? { clearAll: payload.clearAll }
          : {}),
        ...(payload.default !== undefined ? { default: payload.default } : {}),
      });
    }),
    setSpacingAfter: valueCommand(
      "setSpacingAfter",
      (p): true => (paragraph.setSpacingAfter(numOrNull(p)), true),
      (): string => s().spacingAfter,
    ),
    setSpacingBefore: valueCommand(
      "setSpacingBefore",
      (p): true => (paragraph.setSpacingBefore(numOrNull(p)), true),
      (): string => s().spacingBefore,
    ),
    setContextualSpacing: valueCommand(
      "setContextualSpacing",
      (p): true => (paragraph.setContextualSpacing(boolOrNull(p)), true),
      (): unknown => s().contextualSpacing,
    ),
    setLineRule: valueCommand(
      "setLineRule",
      (p): true => (
        paragraph.setLineRule(
          strOrNull(p) as "auto" | "exact" | "atLeast" | null,
        ),
        true
      ),
      (): string => s().lineRule,
    ),
    setTextDirection: valueCommand(
      "setTextDirection",
      (p): true => (paragraph.setTextDirection(strOrNull(p)), true),
      (): string => s().textDirection,
    ),
    setSuppressAutoHyphens: valueCommand(
      "setSuppressAutoHyphens",
      (p): true => (paragraph.setSuppressAutoHyphens(boolOrNull(p)), true),
      (): unknown => s().suppressAutoHyphens,
    ),
    setKinsoku: valueCommand(
      "setKinsoku",
      (p): true => (paragraph.setKinsoku(boolOrNull(p)), true),
      (): unknown => s().kinsoku,
    ),
    setOverflowPunct: valueCommand(
      "setOverflowPunct",
      (p): true => (paragraph.setOverflowPunct(boolOrNull(p)), true),
      (): unknown => s().overflowPunct,
    ),
    setWordWrap: valueCommand(
      "setWordWrap",
      (p): true => (paragraph.setWordWrap(boolOrNull(p)), true),
      (): unknown => s().wordWrap,
    ),
    setAutoSpaceDE: valueCommand(
      "setAutoSpaceDE",
      (p): true => (paragraph.setAutoSpaceDE(boolOrNull(p)), true),
      (): unknown => s().autoSpaceDE,
    ),
    setAutoSpaceDN: valueCommand(
      "setAutoSpaceDN",
      (p): true => (paragraph.setAutoSpaceDN(boolOrNull(p)), true),
      (): unknown => s().autoSpaceDN,
    ),
    setAdjustRightInd: valueCommand(
      "setAdjustRightInd",
      (p): true => (paragraph.setAdjustRightInd(boolOrNull(p)), true),
      (): unknown => s().adjustRightInd,
    ),
    setTopLinePunct: valueCommand(
      "setTopLinePunct",
      (p): true => (paragraph.setTopLinePunct(boolOrNull(p)), true),
      (): unknown => s().topLinePunct,
    ),
    setPageBreakBefore: valueCommand(
      "setPageBreakBefore",
      (p): true => (paragraph.setPageBreakBefore(boolOrNull(p)), true),
      (): unknown => s().pageBreakBefore,
    ),
    setKeepWithNext: valueCommand(
      "setKeepWithNext",
      (p): true => (paragraph.setKeepWithNext(boolOrNull(p)), true),
      (): unknown => s().keepWithNext,
    ),
    setKeepLinesTogether: valueCommand(
      "setKeepLinesTogether",
      (p): true => (paragraph.setKeepLinesTogether(boolOrNull(p)), true),
      (): unknown => s().keepLinesTogether,
    ),
    setMirrorIndents: valueCommand(
      "setMirrorIndents",
      (p): true => (paragraph.setMirrorIndents(boolOrNull(p)), true),
      (): unknown => s().mirrorIndents,
    ),
    setIndentLeft: valueCommand(
      "setIndentLeft",
      (p): true => (paragraph.setIndentLeft(numOrNull(p)), true),
      (): string => s().indentLeft,
    ),
    setIndentRight: valueCommand(
      "setIndentRight",
      (p): true => (paragraph.setIndentRight(numOrNull(p)), true),
      (): string => s().indentRight,
    ),
    setIndentFirstLine: valueCommand(
      "setIndentFirstLine",
      (p): true => (paragraph.setIndentFirstLine(numOrNull(p)), true),
      (): string => s().indentFirstLine,
    ),
    setIndentHanging: valueCommand(
      "setIndentHanging",
      (p): true => (paragraph.setIndentHanging(numOrNull(p)), true),
      (): string => s().indentHanging,
    ),
    setSpecialIndent: actionCommand(
      "setSpecialIndent",
      (p): void => {
        const payload = (p ?? {}) as {
          kind?: "none" | "firstLine" | "hanging";
          value?: unknown;
        };
        paragraph.setSpecialIndent(
          payload.kind ?? "none",
          numOrNull(payload.value),
        );
      },
      (): { isActive: boolean; value: string } => {
        const firstLine = Number(s().indentFirstLine);
        const hanging = Number(s().indentHanging);
        const kind =
          Number.isFinite(hanging) && hanging > 0
            ? "hanging"
            : Number.isFinite(firstLine) && firstLine > 0
              ? "firstLine"
              : "none";
        return {
          isActive: kind !== "none",
          value: kind,
        };
      },
    ),
    setParagraphShading: valueCommand(
      "setParagraphShading",
      (p): true => (paragraph.setShading((p as string) ?? null), true),
      (): string => s().shading || "#ffffff",
    ),
    applyParagraphBorders: actionCommand("applyParagraphBorders", (): void =>
      paragraph.applyBorders(),
    ),
    applyHorizontalLine: actionCommand("applyHorizontalLine", (): void =>
      paragraph.addHorizontalLine(),
    ),
    setDropCap: actionCommand(
      "setDropCap",
      (p): void => {
        const payload = (p ?? {}) as {
          text?: string;
          lines?: number;
          type?: "drop" | "margin" | "none";
          font?: string;
        };
        paragraph.setDropCap(payload);
      },
      (): { value: boolean } => ({
        value: paragraph.hasDropCap(),
      }),
    ),
    setLineHeight: valueCommand(
      "setLineHeight",
      (p): true => (paragraph.setLineHeight(numOrNull(p)), true),
      (): string => s().lineHeight,
    ),
    setListFormat: actionCommand("setListFormat", (p): void =>
      paragraph.setListFormat(String(p)),
    ),
    setListStartAt: actionCommand("setListStartAt", (p): void =>
      paragraph.setListStartAt(numOrNull(p)),
    ),
    setListLevel: actionCommand("setListLevel", (p): void =>
      paragraph.setListLevel(numOrNull(p) ?? 0),
    ),
    toggleOrientation: actionCommand(
      "toggleOrientation",
      (): void => section.toggleOrientation(),
      (): { isActive: boolean } => ({ isActive: section.isLandscape() }),
    ),
    setOrientation: actionCommand("setOrientation", (p): void =>
      section.setOrientation(p as "portrait" | "landscape"),
    ),
    sectionBreakNextPage: actionCommand("sectionBreakNextPage", (): void =>
      section.breakNextPage(),
    ),
    sectionBreakContinuous: actionCommand("sectionBreakContinuous", (): void =>
      section.breakContinuous(),
    ),
    sectionBreakEvenPage: actionCommand("sectionBreakEvenPage", (): void =>
      section.breakEvenPage(),
    ),
    sectionBreakOddPage: actionCommand("sectionBreakOddPage", (): void =>
      section.breakOddPage(),
    ),
    sectionBreakNextColumn: actionCommand("sectionBreakNextColumn", (): void =>
      section.breakNextColumn(),
    ),
    setPageMargins: actionCommand(
      "setPageMargins",
      (p): void => {
        section.setPageMargins((p ?? {}) as Partial<EditorPageMargins>);
      },
      (): { value: EditorPageMargins | undefined } => ({
        value: section.getMargins(),
      }),
    ),
    setMarginsPreset: actionCommand("setMarginsPreset", (p): void => {
      if (typeof p === "string" && p.length > 0) {
        section.setMarginsPreset(p);
      }
    }),
    setSectionPageNumbering: actionCommand(
      "setSectionPageNumbering",
      (p): void => {
        const numbering = (p ?? {}) as Record<string, unknown>;
        section.setPageNumbering({
          ...(numbering.start !== undefined
            ? { start: Number(numbering.start) }
            : {}),
          ...(typeof numbering.format === "string"
            ? { format: numbering.format as SectionPageNumberFormat }
            : {}),
        });
      },
      (): { value: EditorPageNumbering | undefined } => ({
        value: section.getPageNumbering(),
      }),
    ),
    setPaperSize: actionCommand(
      "setPaperSize",
      (p): void => {
        const dims = (p ?? {}) as { widthPt?: number; heightPt?: number };
        if (dims.widthPt !== undefined && dims.heightPt !== undefined) {
          section.setPaperSize({
            widthPt: Number(dims.widthPt),
            heightPt: Number(dims.heightPt),
          });
        }
      },
      (): { value: { widthPt: number; heightPt: number } | undefined } => ({
        value: section.getPaperSize(),
      }),
    ),
    setPaperSizePreset: actionCommand("setPaperSizePreset", (p): void => {
      if (typeof p === "string" && p.length > 0) {
        section.setPaperSizePreset(p);
      }
    }),
    setColumns: actionCommand("setColumns", (p): void => {
      const cols = (p ?? {}) as {
        count?: number;
        space?: number;
        separator?: boolean;
      };
      if (cols.count !== undefined) {
        section.setColumns({
          count: Number(cols.count),
          ...(cols.space !== undefined ? { space: Number(cols.space) } : {}),
          ...(cols.separator !== undefined
            ? { separator: Boolean(cols.separator) }
            : {}),
        });
      }
    }),
    setColumnsPreset: actionCommand("setColumnsPreset", (p): void => {
      if (typeof p === "string" && p.length > 0) {
        const preset = getColumnLayoutPreset(p);
        if (!preset) return;
        section.setColumns({ count: preset.count });
      }
    }),
    setSectionVerticalAlign: actionCommand(
      "setSectionVerticalAlign",
      (p): void => {
        const align = (p ?? undefined) as
          "top" | "center" | "both" | "bottom" | undefined;
        if (
          align === undefined ||
          align === "top" ||
          align === "center" ||
          align === "both" ||
          align === "bottom"
        ) {
          section.setVerticalAlign(align ?? "top");
        }
      },
      (): { value: string | undefined } => ({
        value: section.getVerticalAlign(),
      }),
    ),
    setSectionBidi: actionCommand(
      "setSectionBidi",
      (p): void => {
        const enabled = (p ?? undefined) as boolean | undefined;
        section.setBidi(enabled ?? true);
      },
      (): { value: boolean | undefined } => ({
        value: section.getBidi(),
      }),
    ),
    setHyphenation: actionCommand(
      "setHyphenation",
      (p): void => {
        const payload = (p ?? {}) as {
          value?: boolean;
          zone?: number;
          caps?: boolean;
          limit?: number;
        };
        section.setHyphenation(payload);
      },
      (): { value: boolean } => ({
        value: section.getHyphenation().value,
      }),
    ),
  };
}
