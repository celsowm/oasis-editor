import { createEffect, createMemo, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Dialog } from "./Dialog.js";

export interface LineSpacingDialogInitialValues {
  lineHeight: string;
  spacingBefore: string;
  spacingAfter: string;
}

export interface LineSpacingDialogApplyValues {
  lineHeight: number | null;
  spacingBefore: number | null;
  spacingAfter: number | null;
}

export interface LineSpacingDialogProps {
  isOpen: boolean;
  initial: LineSpacingDialogInitialValues;
  onClose: () => void;
  onApply: (
    values: LineSpacingDialogApplyValues,
    original: LineSpacingDialogInitialValues,
  ) => void;
}

export function LineSpacingDialog(props: LineSpacingDialogProps) {
  const t = useI18n();
  const [lineHeight, setLineHeight] = createSignal("");
  const [spacingBefore, setSpacingBefore] = createSignal("");
  const [spacingAfter, setSpacingAfter] = createSignal("");

  createEffect(() => {
    if (props.isOpen) {
      setLineHeight(props.initial.lineHeight ?? "");
      setSpacingBefore(props.initial.spacingBefore ?? "");
      setSpacingAfter(props.initial.spacingAfter ?? "");
    }
  });

  const parseNumber = (value: string): number | null => {
    if (value.trim() === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const previewStyle = createMemo(() => {
    const lh = parseNumber(lineHeight());
    return {
      "line-height": lh !== null && lh > 0 ? String(lh) : undefined,
    } as Record<string, string | undefined>;
  });

  const handleApply = () => {
    props.onApply(
      {
        lineHeight: parseNumber(lineHeight()),
        spacingBefore: parseNumber(spacingBefore()),
        spacingAfter: parseNumber(spacingAfter()),
      },
      props.initial,
    );
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("lineSpacing.title")}
      onClose={props.onClose}
      footer={
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-line-spacing-dialog-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleApply}
            data-testid="editor-line-spacing-dialog-apply"
          >
            {t("generic.apply")}
          </button>
        </>
      }
    >
      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("lineSpacing.lineSpacingLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0.5"
            step="0.05"
            value={lineHeight()}
            onInput={(e) => setLineHeight(e.currentTarget.value)}
            data-testid="editor-line-spacing-dialog-line-height"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-row">
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("lineSpacing.spacingBeforeLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0"
            step="1"
            value={spacingBefore()}
            onInput={(e) => setSpacingBefore(e.currentTarget.value)}
            data-testid="editor-line-spacing-dialog-spacing-before"
          />
        </div>
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("lineSpacing.spacingAfterLabel")}
          </label>
          <input
            type="number"
            class="oasis-editor-dialog-input"
            min="0"
            step="1"
            value={spacingAfter()}
            onInput={(e) => setSpacingAfter(e.currentTarget.value)}
            data-testid="editor-line-spacing-dialog-spacing-after"
          />
        </div>
      </div>

      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("lineSpacing.preview")}
        </label>
        <div
          class="oasis-editor-dialog-preview"
          data-testid="editor-line-spacing-dialog-preview"
          style={previewStyle()}
        >
          {t("lineSpacing.previewText")}
          <br />
          {t("lineSpacing.previewText")}
        </div>
      </div>
    </Dialog>
  );
}
