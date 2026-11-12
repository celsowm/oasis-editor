import { createSignal, type JSX } from "solid-js";
import { TextField } from "@/ui/public/TextField.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { formatDecimal, parseDecimal } from "@/utils/parseNumber.js";

export interface MetricFieldProps {
  /** Model value formatted with a dot decimal, or `""` when mixed/absent. */
  value: string;
  label: string;
  title: string;
  unit: "pt" | "cm";
  testId: string;
  /** Extra class on the field wrapper (layout-specific positioning). */
  class?: string;
  min?: string;
  step?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}

/**
 * One numeric measurement (paragraph metric, image size). Edits stay local
 * until Enter or blur — like Word's Layout fields — because the commands that
 * consume them return focus to the document, which would otherwise tear focus
 * out of the field (and, for object selections, drop the contextual tab) after
 * the first keystroke. Values display and accept the document's decimal
 * separator (`2,5` in pt-BR); the model still stores a dot decimal.
 */
export function MetricField(props: MetricFieldProps): JSX.Element {
  const t = useI18n();
  const [draft, setDraft] = createSignal<string | null>(null);
  const separator = (): string => t("number.decimalSeparator");
  const localized = (): boolean => separator() !== ".";
  const display = (): string =>
    draft() ?? formatDecimal(props.value, separator());

  const commit = (): void => {
    const raw = draft();
    if (raw === null) return;
    setDraft(null);
    if (raw === formatDecimal(props.value, separator())) return;
    // Empty clears the metric (back to its default); non-numeric text is
    // discarded like Word's fields rather than silently resetting the value.
    if (raw.trim() === "") {
      props.onChange(null);
      return;
    }
    const parsed = parseDecimal(raw);
    if (parsed === null) return;
    props.onChange(parsed);
  };

  return (
    <TextField
      class={`oasis-editor-tool-metric ${props.class ?? ""}`}
      labelClass="oasis-editor-tool-metric-label"
      title={props.title}
      aria-label={`${props.title} (${props.unit})`}
      label={props.label}
      suffix={props.unit}
      controlClass="oasis-editor-tool-number"
      data-testid={props.testId}
      type={localized() ? "text" : "number"}
      inputMode={localized() ? "decimal" : undefined}
      min={props.min}
      step={props.step}
      disabled={props.disabled}
      value={display()}
      onChange={(raw): void => {
        setDraft(raw);
      }}
      onBlur={commit}
      onKeyDown={(event): void => {
        // Enter leaves the field; its blur commits. Prevent the default so the
        // key cannot reach the editor after the command refocuses it (which
        // inserted a stray line break), and commit on the keydown itself would
        // push a second history entry.
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}
