import type { OasisPlugin } from "@/core/plugin.js";
import type { EditorPageMargins, EditorPageNumbering } from "@/core/model.js";
import type { SectionPageNumberFormat } from "@/core/commands/pageNumber.js";
import { getColumnLayoutPreset } from "@/core/commands/pageSetup.js";
import type {
  ActionCommandBuilder,
  ValueCommandBuilder,
} from "../essentialsCommandBuilders.js";
import { numOrNull } from "../essentialsCommandBuilders.js";
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
  };
}
