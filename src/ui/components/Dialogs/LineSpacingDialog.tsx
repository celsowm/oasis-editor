import { createEffect, createMemo, createSignal } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/public/Button.js";
import { FormField } from "@/ui/public/FormField.js";
import { Grid } from "@/ui/public/Grid.js";
import { NumberField } from "@/ui/public/NumberField.js";
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
  const parseNumber = (value: string): number | null => {
    if (value.trim() === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const [lineHeight, setLineHeight] = createSignal<number | null>(null);
  const [spacingBefore, setSpacingBefore] = createSignal<number | null>(null);
  const [spacingAfter, setSpacingAfter] = createSignal<number | null>(null);

  createEffect(() => {
    if (props.isOpen) {
      setLineHeight(parseNumber(props.initial.lineHeight ?? ""));
      setSpacingBefore(parseNumber(props.initial.spacingBefore ?? ""));
      setSpacingAfter(parseNumber(props.initial.spacingAfter ?? ""));
    }
  });

  const previewStyle = createMemo(() => {
    const lh = lineHeight();
    return {
      "line-height": lh !== null && lh > 0 ? String(lh) : undefined,
    } as Record<string, string | undefined>;
  });

  const handleApply = () => {
    props.onApply(
      {
        lineHeight: lineHeight(),
        spacingBefore: spacingBefore(),
        spacingAfter: spacingAfter(),
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
          <Button
            variant="secondary"
            onClick={props.onClose}
            data-testid="editor-line-spacing-dialog-cancel"
          >
            {t("generic.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleApply}
            data-testid="editor-line-spacing-dialog-apply"
          >
            {t("generic.apply")}
          </Button>
        </>
      }
    >
      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <NumberField
            label={t("lineSpacing.lineSpacingLabel")}
            min="0.5"
            step="0.05"
            value={lineHeight() ?? ""}
            onChange={setLineHeight}
            data-testid="editor-line-spacing-dialog-line-height"
          />
        </Grid>
      </Grid>

      <Grid container spacing={1.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <NumberField
            label={t("lineSpacing.spacingBeforeLabel")}
            min="0"
            step="1"
            value={spacingBefore() ?? ""}
            onChange={setSpacingBefore}
            data-testid="editor-line-spacing-dialog-spacing-before"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <NumberField
            label={t("lineSpacing.spacingAfterLabel")}
            min="0"
            step="1"
            value={spacingAfter() ?? ""}
            onChange={setSpacingAfter}
            data-testid="editor-line-spacing-dialog-spacing-after"
          />
        </Grid>
      </Grid>

      <FormField label={t("lineSpacing.preview")}>
        <div
          class="oasis-editor-dialog-preview"
          data-testid="editor-line-spacing-dialog-preview"
          style={previewStyle()}
        >
          {t("lineSpacing.previewText")}
          <br />
          {t("lineSpacing.previewText")}
        </div>
      </FormField>
    </Dialog>
  );
}
