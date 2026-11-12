import { createSignal, type JSX } from "solid-js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";
import { TextField } from "@/ui/public/TextField.js";
import { pxToPt, ptToPx } from "@/export/pdf/units.js";
import { cmToPx, pxToCm } from "@/ui/components/Toolbar/marginPresets.js";
import { formatDecimal, parseDecimal } from "@/utils/parseNumber.js";
import { roundTo } from "@/utils/round.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

const numValue = (api: ToolbarActionApi, command: string): string => {
  const value = api.commands.state(command).value;
  return value == null ? "" : String(value);
};

const numericValue = (
  api: ToolbarActionApi,
  command: string,
): number | undefined => {
  const value = api.commands.state(command).value;
  if (value == null || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const ptValue = (api: ToolbarActionApi, command: string): string => {
  const value = numericValue(api, command);
  return value === undefined ? "" : String(roundTo(pxToPt(value), 2));
};

const cmValue = (api: ToolbarActionApi, command: string): string => {
  const value = numericValue(api, command);
  return value === undefined ? "" : String(pxToCm(value));
};

interface MetricFieldProps {
  api: ToolbarActionApi;
  command: string;
  /** Model value formatted with a dot decimal, or `""` when mixed/absent. */
  value: string;
  label: string;
  title: string;
  unit: "pt" | "cm";
  testId: string;
  min?: string;
  step?: string;
  onChange: (value: number | null) => void;
}

/**
 * One numeric paragraph metric. Edits stay local until Enter or blur — like
 * Word's Layout fields — because the paragraph command returns focus to the
 * document, which would otherwise tear focus out of the field after the first
 * keystroke. Values display and accept the document's decimal separator
 * (`2,5` in pt-BR); the model still stores a dot decimal.
 */
function MetricField(props: MetricFieldProps): JSX.Element {
  const t = useI18n();
  const [draft, setDraft] = createSignal<string | null>(null);
  const separator = (): string => t("number.decimalSeparator");
  const localized = (): boolean => separator() !== ".";
  const display = (): string =>
    draft() ?? formatDecimal(props.value, separator());
  const disabled = (): boolean =>
    !props.api.commands.state(props.command).isEnabled;

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
      class="oasis-editor-tool-metric"
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
      disabled={disabled()}
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

/**
 * Paragraph metrics panel (spacing, indents, shading, borders) — command-driven.
 *
 * Word greys the Layout-tab Paragraph controls out in read-only documents
 * instead of hiding the panel, so each control follows its command's enabled
 * state. Units live in the accessible name (`Spacing After (pt)`) as well as in
 * the visible suffix, and decimal values use the document's separator.
 */
export function MetricGroup(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const api = props.api;
  const enabled = (command: string): boolean =>
    api.commands.state(command).isEnabled;

  return (
    <Menu
      icon="sliders-horizontal"
      testId="editor-toolbar-metrics-dropdown"
      tooltip={t("paragraph.title")}
      hideChevron
      panelClass="oasis-editor-toolbar-panel"
      keepMounted
    >
      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="file-up"
          active={api.commands.state("togglePageBreakBefore").isActive}
          disabled={!enabled("togglePageBreakBefore")}
          data-testid="editor-toolbar-page-break-before"
          onClick={() => api.commands.execute("togglePageBreakBefore")}
          tooltip={t("metric.pageBreakBefore")}
        />
        <Button
          icon="link-2"
          active={api.commands.state("toggleKeepWithNext").isActive}
          disabled={!enabled("toggleKeepWithNext")}
          data-testid="editor-toolbar-keep-with-next"
          onClick={() => api.commands.execute("toggleKeepWithNext")}
          tooltip={t("metric.keepWithNext")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-grid">
        <MetricField
          api={api}
          command="setSpacingAfter"
          label={t("metric.after")}
          title={t("metric.spacingAfter")}
          unit="pt"
          testId="editor-toolbar-spacing-after"
          min="0"
          step="1"
          value={ptValue(api, "setSpacingAfter")}
          onChange={(value) =>
            api.commands.execute(
              "setSpacingAfter",
              value == null ? null : ptToPx(value),
            )
          }
        />

        <MetricField
          api={api}
          command="setIndentLeft"
          label={t("metric.indent")}
          title={t("metric.leftIndent")}
          unit="cm"
          testId="editor-toolbar-indent-left"
          min="0"
          step="0.1"
          value={cmValue(api, "setIndentLeft")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentLeft",
              value == null ? null : cmToPx(value),
            )
          }
        />

        <MetricField
          api={api}
          command="setIndentFirstLine"
          label={t("metric.first")}
          title={t("metric.firstLineIndent")}
          unit="cm"
          testId="editor-toolbar-indent-first-line"
          step="0.1"
          value={cmValue(api, "setIndentFirstLine")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentFirstLine",
              value == null ? null : cmToPx(value),
            )
          }
        />

        <MetricField
          api={api}
          command="setIndentHanging"
          label={t("metric.hang")}
          title={t("metric.hangingIndent")}
          unit="cm"
          testId="editor-toolbar-indent-hanging"
          min="0"
          step="0.1"
          value={cmValue(api, "setIndentHanging")}
          onChange={(value) =>
            api.commands.execute(
              "setIndentHanging",
              value == null ? null : cmToPx(value),
            )
          }
        />

        <TextField
          class="oasis-editor-tool-color"
          labelClass="oasis-editor-tool-metric-label"
          title={t("metric.paragraphBgColor")}
          label={t("metric.paraBg")}
          type="color"
          controlClass="oasis-editor-tool-color-input"
          data-testid="editor-toolbar-paragraph-shading"
          disabled={!enabled("setParagraphShading")}
          value={numValue(api, "setParagraphShading") || "#ffffff"}
          onChange={(value) =>
            api.commands.execute("setParagraphShading", value)
          }
        />

        <Button
          icon="frame"
          disabled={!enabled("applyParagraphBorders")}
          data-testid="editor-toolbar-paragraph-borders"
          onClick={() => api.commands.execute("applyParagraphBorders")}
          tooltip={t("metric.applyBorders")}
        />
      </div>
    </Menu>
  );
}
