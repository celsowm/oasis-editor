import { createEffect, createMemo, createSignal } from "solid-js";
import { Dialog } from "./Dialog.js";
import { t } from "../../../i18n/index.js";
import type { EditorParagraphStyle } from "../../../core/model.js";

type SpecialIndent = "none" | "firstLine" | "hanging";

export interface ParagraphDialogInitialValues {
  align: string;
  indentLeft: string;
  indentRight: string;
  indentFirstLine: string;
  indentHanging: string;
  spacingBefore: string;
  spacingAfter: string;
  lineHeight: string;
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
}

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

  createEffect(() => {
    if (props.isOpen) {
      setAlign(props.initial.align ?? "");
      setIndentLeft(props.initial.indentLeft ?? "");
      setIndentRight(props.initial.indentRight ?? "");
      setSpacingBefore(props.initial.spacingBefore ?? "");
      setSpacingAfter(props.initial.spacingAfter ?? "");
      setLineHeight(props.initial.lineHeight ?? "");

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
    return {
      "text-align": align() || undefined,
      "line-height": lh !== null && lh > 0 ? String(lh) : undefined,
      "padding-left":
        left !== null ? `${left + (hanging ?? 0)}pt` : undefined,
      "padding-right": right !== null ? `${right}pt` : undefined,
      "text-indent": textIndent !== null ? `${textIndent}pt` : undefined,
    } as Record<string, string | undefined>;
  });

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

      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">{t("paragraph.preview")}</label>
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
