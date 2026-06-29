import { createEffect, createMemo, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { ColorField } from "@/ui/public/ColorField.js";
import { FormField } from "@/ui/public/FormField.js";
import { Grid } from "@/ui/public/Grid.js";
import { NumberField } from "@/ui/public/NumberField.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { Stack } from "@/ui/public/Stack.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";

import type { EditorBorderStyle, EditorParagraphStyle } from "@/core/model.js";
import { JSX } from "solid-js";

type SpecialIndent = "none" | "firstLine" | "hanging";
type BorderStyleValue = "none" | "solid" | "dashed" | "dotted";

export interface ParagraphDialogInitialValues {
  align: string;
  indentLeft: string;
  indentRight: string;
  indentFirstLine: string;
  indentHanging: string;
  spacingBefore: string;
  spacingAfter: string;
  lineHeight: string;
  shading: string;
  borderStyle: string;
  borderWidth: string;
  borderColor: string;
  borderSideTop: boolean;
  borderSideRight: boolean;
  borderSideBottom: boolean;
  borderSideLeft: boolean;
}

export interface ParagraphDialogBorders {
  top: EditorBorderStyle | null;
  right: EditorBorderStyle | null;
  bottom: EditorBorderStyle | null;
  left: EditorBorderStyle | null;
}

export interface ParagraphDialogApplyValues {
  align: EditorParagraphStyle["align"] | null;
  indentLeft: number | null;
  indentRight: number | null;
  indentFirstLine: number | null;
  indentHanging: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
  lineHeight: number | null;
  shading: string | null;
  /**
   * Per-edge paragraph borders. The dialog edits one shared style/width/color
   * and toggles which edges carry it; each edge is the shared border or `null`.
   */
  borders: ParagraphDialogBorders;
}

const DEFAULT_BORDER_WIDTH_PT = 0.5;
const DEFAULT_BORDER_COLOR = "#000000";

export interface ParagraphDialogProps {
  isOpen: boolean;
  initial: ParagraphDialogInitialValues;
  onClose: () => void;
  onApply: (
    values: ParagraphDialogApplyValues,
    original: ParagraphDialogInitialValues,
  ) => void;
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function ParagraphDialog(props: ParagraphDialogProps): JSX.Element {
  const t = useI18n();
  const [align, setAlign] = createSignal("");
  const [indentLeft, setIndentLeft] = createSignal<number | null>(null);
  const [indentRight, setIndentRight] = createSignal<number | null>(null);
  const [special, setSpecial] = createSignal<SpecialIndent>("none");
  const [specialBy, setSpecialBy] = createSignal<number | null>(null);
  const [spacingBefore, setSpacingBefore] = createSignal<number | null>(null);
  const [spacingAfter, setSpacingAfter] = createSignal<number | null>(null);
  const [lineHeight, setLineHeight] = createSignal<number | null>(null);
  const [shading, setShading] = createSignal("");
  const [borderStyle, setBorderStyle] = createSignal<BorderStyleValue>("none");
  const [borderWidth, setBorderWidth] = createSignal<number | null>(null);
  const [borderColor, setBorderColor] = createSignal("");
  const [sideTop, setSideTop] = createSignal(false);
  const [sideRight, setSideRight] = createSignal(false);
  const [sideBottom, setSideBottom] = createSignal(false);
  const [sideLeft, setSideLeft] = createSignal(false);

  createEffect((): void => {
    if (props.isOpen) {
      setAlign(props.initial.align ?? "");
      setIndentLeft(parseNumber(props.initial.indentLeft ?? ""));
      setIndentRight(parseNumber(props.initial.indentRight ?? ""));
      setSpacingBefore(parseNumber(props.initial.spacingBefore ?? ""));
      setSpacingAfter(parseNumber(props.initial.spacingAfter ?? ""));
      setLineHeight(parseNumber(props.initial.lineHeight ?? ""));
      setShading(props.initial.shading ?? "");
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

  const previewStyle = createMemo((): Record<string, string | undefined> => {
    const lh = lineHeight();
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
    return {
      "text-align": align() || undefined,
      "line-height": lh !== null && lh > 0 ? String(lh) : undefined,
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

  const handleApply = (): void => {
    const by = specialBy();
    props.onApply(
      {
        align: (align() || null) as ParagraphDialogApplyValues["align"],
        indentLeft: indentLeft(),
        indentRight: indentRight(),
        indentFirstLine: special() === "firstLine" ? by : null,
        indentHanging: special() === "hanging" ? by : null,
        spacingBefore: spacingBefore(),
        spacingAfter: spacingAfter(),
        lineHeight: lineHeight(),
        shading: shading().trim() || null,
        borders: resolveBorders(),
      },
      props.initial,
    );
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("paragraph.title")}
      onClose={props.onClose}
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={handleApply}
          cancelLabel={t("generic.cancel")}
          confirmLabel={t("generic.apply")}
          cancelTestId="editor-paragraph-dialog-cancel"
          confirmTestId="editor-paragraph-dialog-apply"
        />
      }
    >
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SelectField
            label={t("paragraph.alignLabel")}
            value={align()}
            onChange={setAlign}
            data-testid="editor-paragraph-dialog-align"
            options={[
              { value: "left", label: t("paragraph.alignLeft") },
              { value: "center", label: t("paragraph.alignCenter") },
              { value: "right", label: t("paragraph.alignRight") },
              { value: "justify", label: t("paragraph.alignJustify") },
            ]}
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <NumberField
            label={t("paragraph.indentLeftLabel")}
            step="1"
            value={indentLeft() ?? ""}
            onChange={setIndentLeft}
            data-testid="editor-paragraph-dialog-indent-left"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <NumberField
            label={t("paragraph.indentRightLabel")}
            step="1"
            value={indentRight() ?? ""}
            onChange={setIndentRight}
            data-testid="editor-paragraph-dialog-indent-right"
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SelectField
            label={t("paragraph.specialLabel")}
            value={special()}
            onChange={(value): void => {
              const next = value as SpecialIndent;
              setSpecial(next);
              if (next === "none") setSpecialBy(null);
            }}
            data-testid="editor-paragraph-dialog-special"
            options={[
              { value: "none", label: t("paragraph.specialNone") },
              { value: "firstLine", label: t("paragraph.specialFirstLine") },
              { value: "hanging", label: t("paragraph.specialHanging") },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <NumberField
            label={t("paragraph.specialByLabel")}
            min="0"
            step="1"
            disabled={special() === "none"}
            value={specialBy() ?? ""}
            onChange={setSpecialBy}
            data-testid="editor-paragraph-dialog-special-by"
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <NumberField
            label={t("paragraph.spacingBeforeLabel")}
            min="0"
            step="1"
            value={spacingBefore() ?? ""}
            onChange={setSpacingBefore}
            data-testid="editor-paragraph-dialog-spacing-before"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <NumberField
            label={t("paragraph.spacingAfterLabel")}
            min="0"
            step="1"
            value={spacingAfter() ?? ""}
            onChange={setSpacingAfter}
            data-testid="editor-paragraph-dialog-spacing-after"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <NumberField
            label={t("paragraph.lineSpacingLabel")}
            min="0.5"
            step="0.05"
            value={lineHeight() ?? ""}
            onChange={setLineHeight}
            data-testid="editor-paragraph-dialog-line-height"
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 3 }}>
          <SelectField
            label={t("paragraph.borderStyleLabel")}
            value={borderStyle()}
            onChange={(value): void => {
              const next = value as BorderStyleValue;
              setBorderStyle(next);
              if (next === "none") {
                setSideTop(false);
                setSideRight(false);
                setSideBottom(false);
                setSideLeft(false);
              } else if (
                !sideTop() &&
                !sideRight() &&
                !sideBottom() &&
                !sideLeft()
              ) {
                setSideTop(true);
                setSideRight(true);
                setSideBottom(true);
                setSideLeft(true);
              }
            }}
            data-testid="editor-paragraph-dialog-border-style"
            options={[
              { value: "none", label: t("paragraph.borderNone") },
              { value: "solid", label: t("paragraph.borderSolid") },
              { value: "dashed", label: t("paragraph.borderDashed") },
              { value: "dotted", label: t("paragraph.borderDotted") },
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <NumberField
            label={t("paragraph.borderWidthLabel")}
            min="0"
            step="0.25"
            disabled={borderStyle() === "none"}
            value={borderWidth() ?? ""}
            onChange={setBorderWidth}
            data-testid="editor-paragraph-dialog-border-width"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorField
            label={t("paragraph.borderColorLabel")}
            disabled={borderStyle() === "none"}
            value={borderColor() || DEFAULT_BORDER_COLOR}
            onChange={setBorderColor}
            data-testid="editor-paragraph-dialog-border-color"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 3 }}>
          <ColorField
            label={t("paragraph.shadingLabel")}
            value={shading() || "#ffffff"}
            onChange={setShading}
            data-testid="editor-paragraph-dialog-shading"
          />
        </Grid>
      </Grid>

      <FormField
        class="oasis-editor-dialog-input-group-grow"
        label={t("paragraph.borderSidesLabel")}
      >
        <Stack
          class="oasis-editor-dialog-style-row"
          direction="row"
          spacing={1}
        >
          <Checkbox
            label={t("paragraph.borderSideTop")}
            disabled={borderStyle() === "none"}
            checked={sideTop()}
            onChange={setSideTop}
            data-testid="editor-paragraph-dialog-border-side-top"
          />
          <Checkbox
            label={t("paragraph.borderSideRight")}
            disabled={borderStyle() === "none"}
            checked={sideRight()}
            onChange={setSideRight}
            data-testid="editor-paragraph-dialog-border-side-right"
          />
          <Checkbox
            label={t("paragraph.borderSideBottom")}
            disabled={borderStyle() === "none"}
            checked={sideBottom()}
            onChange={setSideBottom}
            data-testid="editor-paragraph-dialog-border-side-bottom"
          />
          <Checkbox
            label={t("paragraph.borderSideLeft")}
            disabled={borderStyle() === "none"}
            checked={sideLeft()}
            onChange={setSideLeft}
            data-testid="editor-paragraph-dialog-border-side-left"
          />
        </Stack>
      </FormField>

      <FormField label={t("paragraph.preview")}>
        <div
          class="oasis-editor-dialog-preview"
          data-testid="editor-paragraph-dialog-preview"
          style={previewStyle()}
        >
          {t("paragraph.previewText")}
        </div>
      </FormField>
    </Dialog>
  );
}
