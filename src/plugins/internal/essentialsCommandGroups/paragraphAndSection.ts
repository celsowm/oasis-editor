import type { OasisPlugin } from "@/core/plugin.js";
import type { EditorPageMargins } from "@/core/model.js";
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
    setPageMargins: actionCommand(
      "setPageMargins",
      (p): void => {
        section.setPageMargins((p ?? {}) as Partial<EditorPageMargins>);
      },
      (): { value: EditorPageMargins | undefined } => ({
        value: section.getMargins(),
      }),
    ),
  };
}
