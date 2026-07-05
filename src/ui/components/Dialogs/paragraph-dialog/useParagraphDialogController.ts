import { createEffect, createMemo, createSignal } from "solid-js";
import { parseNumber } from "@/utils/parseNumber.js";
import type { EditorBorderStyle, EditorTabStop } from "@/core/model.js";
import {
  DEFAULT_BORDER_COLOR,
  DEFAULT_BORDER_WIDTH_PT,
  OUTLINE_BODY,
  PT_TO_PX,
  deriveLineSpacing,
  type BorderStyleValue,
  type LineRuleValue,
  type LineSpacingMode,
  type ParagraphDialogApplyValues,
  type ParagraphDialogBorders,
  type ParagraphDialogProps,
  type SpecialIndent,
} from "./ParagraphDialogTypes.js";

/**
 * Owns the Paragraph dialog's form state (hydrated from `props.initial` on
 * open), the derived preview/line-spacing/border resolution, and the
 * apply/set-default handlers. The signals are returned under their original
 * names so the dialog's panels can read them directly.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- return shape is exported below as ParagraphDialogController via ReturnType
export function useParagraphDialogController(props: ParagraphDialogProps) {
  const [align, setAlign] = createSignal("");
  const [outlineLevel, setOutlineLevel] = createSignal(OUTLINE_BODY);
  const [indentLeft, setIndentLeft] = createSignal<number | null>(null);
  const [indentRight, setIndentRight] = createSignal<number | null>(null);
  const [special, setSpecial] = createSignal<SpecialIndent>("none");
  const [specialBy, setSpecialBy] = createSignal<number | null>(null);
  const [mirrorIndents, setMirrorIndents] = createSignal(false);
  const [spacingBefore, setSpacingBefore] = createSignal<number | null>(null);
  const [spacingAfter, setSpacingAfter] = createSignal<number | null>(null);
  const [lineMode, setLineMode] = createSignal<LineSpacingMode>("multiple");
  const [lineAt, setLineAt] = createSignal<number | null>(null);
  const [contextualSpacing, setContextualSpacing] = createSignal(false);
  const [shading, setShading] = createSignal("");
  const [borderStyle, setBorderStyle] = createSignal<BorderStyleValue>("none");
  const [borderWidth, setBorderWidth] = createSignal<number | null>(null);
  const [borderColor, setBorderColor] = createSignal("");
  const [sideTop, setSideTop] = createSignal(false);
  const [sideRight, setSideRight] = createSignal(false);
  const [sideBottom, setSideBottom] = createSignal(false);
  const [sideLeft, setSideLeft] = createSignal(false);
  const [pageBreakBefore, setPageBreakBefore] = createSignal(false);
  const [keepWithNext, setKeepWithNext] = createSignal(false);
  const [keepLinesTogether, setKeepLinesTogether] = createSignal(false);
  const [widowControl, setWidowControl] = createSignal(true);
  const [tabs, setTabs] = createSignal<EditorTabStop[]>([]);

  createEffect((): void => {
    if (props.isOpen) {
      setAlign(props.initial.align ?? "");
      setOutlineLevel(props.initial.outlineLevel ?? OUTLINE_BODY);
      setIndentLeft(parseNumber(props.initial.indentLeft ?? ""));
      setIndentRight(parseNumber(props.initial.indentRight ?? ""));
      setMirrorIndents(props.initial.mirrorIndents ?? false);
      setSpacingBefore(parseNumber(props.initial.spacingBefore ?? ""));
      setSpacingAfter(parseNumber(props.initial.spacingAfter ?? ""));
      setContextualSpacing(props.initial.contextualSpacing ?? false);
      setShading(props.initial.shading ?? "");

      const { mode, at } = deriveLineSpacing(
        props.initial.lineRule ?? "",
        parseNumber(props.initial.lineHeight ?? ""),
      );
      setLineMode(mode);
      setLineAt(at);

      const initialBorderStyle = props.initial.borderStyle;
      setBorderStyle(
        initialBorderStyle === "solid" ||
          initialBorderStyle === "dashed" ||
          initialBorderStyle === "dotted"
          ? initialBorderStyle
          : "none",
      );
      setBorderWidth(parseNumber(props.initial.borderWidth ?? ""));
      setBorderColor(props.initial.borderColor ?? "");
      setSideTop(props.initial.borderSideTop ?? false);
      setSideRight(props.initial.borderSideRight ?? false);
      setSideBottom(props.initial.borderSideBottom ?? false);
      setSideLeft(props.initial.borderSideLeft ?? false);

      setPageBreakBefore(props.initial.pageBreakBefore ?? false);
      setKeepWithNext(props.initial.keepWithNext ?? false);
      setKeepLinesTogether(props.initial.keepLinesTogether ?? false);
      setWidowControl(props.initial.widowControl ?? true);
      setTabs(props.initial.tabs ?? []);

      const firstLine = parseNumber(props.initial.indentFirstLine ?? "");
      const hanging = parseNumber(props.initial.indentHanging ?? "");
      if (hanging !== null && hanging > 0) {
        setSpecial("hanging");
        setSpecialBy(hanging);
      } else if (firstLine !== null && firstLine > 0) {
        setSpecial("firstLine");
        setSpecialBy(firstLine);
      } else {
        setSpecial("none");
        setSpecialBy(null);
      }
    }
  });

  const atEnabled = (): boolean =>
    lineMode() === "multiple" ||
    lineMode() === "atLeast" ||
    lineMode() === "exact";

  /** Resolve the editor's `lineHeight`/`lineRule` from the UI mode + "At". */
  const resolveLineSpacing = (): {
    lineHeight: number | null;
    lineRule: LineRuleValue;
  } => {
    switch (lineMode()) {
      case "single":
        return { lineHeight: 1, lineRule: null };
      case "onePointFive":
        return { lineHeight: 1.5, lineRule: null };
      case "double":
        return { lineHeight: 2, lineRule: null };
      case "multiple":
        return { lineHeight: lineAt(), lineRule: null };
      case "atLeast":
        return {
          lineHeight: lineAt() !== null ? lineAt()! * PT_TO_PX : null,
          lineRule: "atLeast",
        };
      case "exact":
        return {
          lineHeight: lineAt() !== null ? lineAt()! * PT_TO_PX : null,
          lineRule: "exact",
        };
    }
  };

  const previewStyle = createMemo((): Record<string, string | undefined> => {
    const left = indentLeft();
    const right = indentRight();
    const firstLine = special() === "firstLine" ? specialBy() : null;
    const hanging = special() === "hanging" ? specialBy() : null;
    const textIndent =
      firstLine !== null ? firstLine : hanging !== null ? -hanging : null;
    const borderCss =
      borderStyle() !== "none"
        ? `${borderWidth() ?? DEFAULT_BORDER_WIDTH_PT}pt ${borderStyle()} ${
            borderColor().trim() || DEFAULT_BORDER_COLOR
          }`
        : undefined;
    const { lineHeight, lineRule } = resolveLineSpacing();
    const lineHeightCss =
      lineHeight === null
        ? undefined
        : lineRule === "exact" || lineRule === "atLeast"
          ? `${lineHeight}px`
          : String(lineHeight);
    return {
      "text-align": align() || undefined,
      "line-height": lineHeightCss,
      "padding-left": left !== null ? `${left + (hanging ?? 0)}pt` : undefined,
      "padding-right": right !== null ? `${right}pt` : undefined,
      "text-indent": textIndent !== null ? `${textIndent}pt` : undefined,
      "background-color": shading().trim() || undefined,
      "border-top": borderCss && sideTop() ? borderCss : undefined,
      "border-right": borderCss && sideRight() ? borderCss : undefined,
      "border-bottom": borderCss && sideBottom() ? borderCss : undefined,
      "border-left": borderCss && sideLeft() ? borderCss : undefined,
    } as Record<string, string | undefined>;
  });

  const resolveBorders = (): ParagraphDialogBorders => {
    const style = borderStyle();
    if (style === "none") {
      return { top: null, right: null, bottom: null, left: null };
    }
    const width = borderWidth();
    const border: EditorBorderStyle = {
      type: style,
      width: width !== null && width > 0 ? width : DEFAULT_BORDER_WIDTH_PT,
      color: borderColor().trim() || DEFAULT_BORDER_COLOR,
    };
    return {
      top: sideTop() ? border : null,
      right: sideRight() ? border : null,
      bottom: sideBottom() ? border : null,
      left: sideLeft() ? border : null,
    };
  };

  const collectValues = (): ParagraphDialogApplyValues => {
    const by = specialBy();
    const { lineHeight, lineRule } = resolveLineSpacing();
    const outline = outlineLevel();
    return {
      align: (align() || null) as ParagraphDialogApplyValues["align"],
      indentLeft: indentLeft(),
      indentRight: indentRight(),
      indentFirstLine: special() === "firstLine" ? by : null,
      indentHanging: special() === "hanging" ? by : null,
      mirrorIndents: mirrorIndents(),
      spacingBefore: spacingBefore(),
      spacingAfter: spacingAfter(),
      lineHeight,
      lineRule,
      contextualSpacing: contextualSpacing(),
      outlineLevel: outline === OUTLINE_BODY ? null : Number(outline),
      shading: shading().trim() || null,
      borders: resolveBorders(),
      pageBreakBefore: pageBreakBefore(),
      keepWithNext: keepWithNext(),
      keepLinesTogether: keepLinesTogether(),
      widowControl: widowControl(),
      tabs: tabs(),
    };
  };

  const handleApply = (): void => {
    props.onApply(collectValues(), props.initial);
    props.onClose();
  };

  const handleSetDefault = (): void => {
    props.onSetDefault?.(collectValues());
    props.onClose();
  };

  return {
    align,
    setAlign,
    outlineLevel,
    setOutlineLevel,
    indentLeft,
    setIndentLeft,
    indentRight,
    setIndentRight,
    special,
    setSpecial,
    specialBy,
    setSpecialBy,
    mirrorIndents,
    setMirrorIndents,
    spacingBefore,
    setSpacingBefore,
    spacingAfter,
    setSpacingAfter,
    lineMode,
    setLineMode,
    lineAt,
    setLineAt,
    contextualSpacing,
    setContextualSpacing,
    shading,
    setShading,
    borderStyle,
    setBorderStyle,
    borderWidth,
    setBorderWidth,
    borderColor,
    setBorderColor,
    sideTop,
    setSideTop,
    sideRight,
    setSideRight,
    sideBottom,
    setSideBottom,
    sideLeft,
    setSideLeft,
    pageBreakBefore,
    setPageBreakBefore,
    keepWithNext,
    setKeepWithNext,
    keepLinesTogether,
    setKeepLinesTogether,
    widowControl,
    setWidowControl,
    tabs,
    setTabs,
    atEnabled,
    previewStyle,
    handleApply,
    handleSetDefault,
  };
}

export type ParagraphDialogController = ReturnType<
  typeof useParagraphDialogController
>;
