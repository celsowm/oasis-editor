import { createEffect, createMemo, createSignal } from "solid-js";
import { Dialog } from "./Dialog.js";
import { t } from "../../../i18n/index.js";
import type {
  EditorBorderStyle,
  EditorParagraphStyle,
} from "../../../core/model.js";

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

export function ParagraphDialog(props: ParagraphDialogProps) {
  const [align, setAlign] = createSignal("");
  const [indentLeft, setIndentLeft] = createSignal("");
  const [indentRight, setIndentRight] = createSignal("");
  const [special, setSpecial] = createSignal<SpecialIndent>("none");
  const [specialBy, setSpecialBy] = createSignal("");
  const [spacingBefore, setSpacingBefore] = createSignal("");
  const [spacingAfter, setSpacingAfter] = createSignal("");
  const [lineHeight, setLineHeight] = createSignal("");
  const [shading, setShading] = createSignal("");
  const [borderStyle, setBorderStyle] = createSignal<BorderStyleValue>("none");
  const [borderWidth, setBorderWidth] = createSignal("");
  const [borderColor, setBorderColor] = createSignal("");
  const [sideTop, setSideTop] = createSignal(false);
  const [sideRight, setSideRight] = createSignal(false);
  const [sideBottom, setSideBottom] = createSignal(false);
  const [sideLeft, setSideLeft] = createSignal(false);

  createEffect(() => {
    if (props.isOpen) {
      setAlign(props.initial.align ?? "");
      setIndentLeft(props.initial.indentLeft ?? "");
      setIndentRight(props.initial.indentRight ?? "");
      setSpacingBefore(props.initial.spacingBefore ?? "");
      setSpacingAfter(props.initial.spacingAfter ?? "");
      setLineHeight(props.initial.lineHeight ?? "");
      setShading(props.initial.shading ?? "");
      const initialBorderStyle = props.initial.borderStyle;
      setBorderStyle(
        initialBorderStyle === "solid" ||
          initialBorderStyle === "dashed" ||
          initialBorderStyle === "dotted"
          ? initialBorderStyle
          : "none",
      );
      setBorderWidth(props.initial.borderWidth ?? "");
      setBorderColor(props.initial.borderColor ?? "");
      setSideTop(props.initial.borderSideTop ?? false);
      setSideRight(props.initial.borderSideRight ?? false);
      setSideBottom(props.initial.borderSideBottom ?? false);
      setSideLeft(props.initial.borderSideLeft ?? false);

      const firstLine = parseNumber(props.initial.indentFirstLine ?? "");
      const hanging = parseNumber(props.initial.indentHanging ?? "");
      if (hanging !== null && hanging > 0) {
        setSpecial("hanging");
        setSpecialBy(props.initial.indentHanging ?? "");
      } else if (firstLine !== null && firstLine > 0) {
        setSpecial("firstLine");
        setSpecialBy(props.initial.indentFirstLine ?? "");
      } else {
        setSpecial("none");
        setSpecialBy("");
      }
    }
  });

  const previewStyle = createMemo(() => {
    const lh = parseNumber(lineHeight());
    const left = parseNumber(indentLeft());
    const right = parseNumber(indentRight());
    const firstLine =
      special() === "firstLine" ? parseNumber(specialBy()) : null;
    const hanging = special() === "hanging" ? parseNumber(specialBy()) : null;
    const textIndent =
      firstLine !== null ? firstLine : hanging !== null ? -hanging : null;
    const borderCss =
      borderStyle() !== "none"
        ? `${parseNumber(borderWidth()) ?? DEFAULT_BORDER_WIDTH_PT}pt ${borderStyle()} ${
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
    const width = parseNumber(borderWidth());
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

  const handleApply = () => {
    const by = parseNumber(specialBy());
    props.onApply(
      {
        align: (align() || null) as ParagraphDialogApplyValues["align"],
        indentLeft: parseNumber(indentLeft()),
        indentRight: parseNumber(indentRight()),
        indentFirstLine: special() === "firstLine" ? by : null,
        indentHanging: special() === "hanging" ? by : null,
        spacingBefore: parseNumber(spacingBefore()),
        spacingAfter: parseNumber(spacingAfter()),
        lineHeight: parseNumber(lineHeight()),
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
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-paragraph-dialog-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleApply}
            data-testid="editor-paragraph-dialog-apply"
          >
            {t("generic.apply")}
          </button>
        </>
      }
    >
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.alignLabel")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={align()}
            onChange={(e) => setAlign(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-align"
          >
            <option value="left">{t("paragraph.alignLeft")}</option>
            <option value="center">{t("paragraph.alignCenter")}</option>
            <option value="right">{t("paragraph.alignRight")}</option>
            <option value="justify">{t("paragraph.alignJustify")}</option>
          </select>
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.indentLeftLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            step="1"
            value={indentLeft()}
            onInput={(e) => setIndentLeft(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-indent-left"
          />
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.indentRightLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            step="1"
            value={indentRight()}
            onInput={(e) => setIndentRight(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-indent-right"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.specialLabel")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={special()}
            onChange={(e) => {
              const next = e.currentTarget.value as SpecialIndent;
              setSpecial(next);
              if (next === "none") setSpecialBy("");
            }}
            data-testid="editor-paragraph-dialog-special"
          >
            <option value="none">{t("paragraph.specialNone")}</option>
            <option value="firstLine">{t("paragraph.specialFirstLine")}</option>
            <option value="hanging">{t("paragraph.specialHanging")}</option>
          </select>
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.specialByLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0"
            step="1"
            disabled={special() === "none"}
            value={specialBy()}
            onInput={(e) => setSpecialBy(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-special-by"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.spacingBeforeLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0"
            step="1"
            value={spacingBefore()}
            onInput={(e) => setSpacingBefore(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-spacing-before"
          />
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.spacingAfterLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0"
            step="1"
            value={spacingAfter()}
            onInput={(e) => setSpacingAfter(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-spacing-after"
          />
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.lineSpacingLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0.5"
            step="0.05"
            value={lineHeight()}
            onInput={(e) => setLineHeight(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-line-height"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.borderStyleLabel")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={borderStyle()}
            onChange={(e) => {
              const next = e.currentTarget.value as BorderStyleValue;
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
          >
            <option value="none">{t("paragraph.borderNone")}</option>
            <option value="solid">{t("paragraph.borderSolid")}</option>
            <option value="dashed">{t("paragraph.borderDashed")}</option>
            <option value="dotted">{t("paragraph.borderDotted")}</option>
          </select>
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.borderWidthLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0"
            step="0.25"
            disabled={borderStyle() === "none"}
            value={borderWidth()}
            onInput={(e) => setBorderWidth(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-border-width"
          />
        </div>
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.borderColorLabel")}
          </label>
          <input
            type="color"
            class="oasis-editor-dialog-input"
            disabled={borderStyle() === "none"}
            value={borderColor() || DEFAULT_BORDER_COLOR}
            onInput={(e) => setBorderColor(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-border-color"
          />
        </div>
        <div class="oasis-editor-dialog-input-group">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.shadingLabel")}
          </label>
          <input
            type="color"
            class="oasis-editor-dialog-input"
            value={shading() || "#ffffff"}
            onInput={(e) => setShading(e.currentTarget.value)}
            data-testid="editor-paragraph-dialog-shading"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("paragraph.borderSidesLabel")}
          </label>
          <div class="oasis-editor-dialog-style-row">
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                disabled={borderStyle() === "none"}
                checked={sideTop()}
                onChange={(e) => setSideTop(e.currentTarget.checked)}
                data-testid="editor-paragraph-dialog-border-side-top"
              />
              {t("paragraph.borderSideTop")}
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                disabled={borderStyle() === "none"}
                checked={sideRight()}
                onChange={(e) => setSideRight(e.currentTarget.checked)}
                data-testid="editor-paragraph-dialog-border-side-right"
              />
              {t("paragraph.borderSideRight")}
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                disabled={borderStyle() === "none"}
                checked={sideBottom()}
                onChange={(e) => setSideBottom(e.currentTarget.checked)}
                data-testid="editor-paragraph-dialog-border-side-bottom"
              />
              {t("paragraph.borderSideBottom")}
            </label>
            <label class="oasis-editor-dialog-style-toggle">
              <input
                type="checkbox"
                disabled={borderStyle() === "none"}
                checked={sideLeft()}
                onChange={(e) => setSideLeft(e.currentTarget.checked)}
                data-testid="editor-paragraph-dialog-border-side-left"
              />
              {t("paragraph.borderSideLeft")}
            </label>
          </div>
        </div>
      </div>

      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("paragraph.preview")}
        </label>
        <div
          class="oasis-editor-dialog-preview"
          data-testid="editor-paragraph-dialog-preview"
          style={previewStyle()}
        >
          {t("paragraph.previewText")}
        </div>
      </div>
    </Dialog>
  );
}
