import { For, type JSX } from "solid-js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import type {
  TableCellAlignment,
  TableCellAlignmentState,
} from "@/core/commands/table.js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { TranslationKey } from "@/i18n/index.js";

const HORIZONTAL: Array<{
  value: TableCellAlignment["horizontal"];
  label: TranslationKey;
}> = [
  { value: "left", label: "table.alignLeft" },
  { value: "center", label: "table.alignCenter" },
  { value: "right", label: "table.alignRight" },
];

const VERTICAL: Array<{
  value: TableCellAlignment["vertical"];
  label: TranslationKey;
}> = [
  { value: "top", label: "table.valignTop" },
  { value: "middle", label: "table.valignMiddle" },
  { value: "bottom", label: "table.valignBottom" },
];

/** 3×3 positional cell-text alignment control for the Table Layout ribbon. */
export function TableCellAlignmentMatrix(props: {
  api: ToolbarActionApi;
  testId?: string;
}): JSX.Element {
  const t = useI18n();
  const alignmentState = (): TableCellAlignmentState | null =>
    props.api.commands.state("tableSetCellAlignment")
      .value as TableCellAlignmentState | null;
  const hasMixedAlignment = (): boolean => {
    const current = alignmentState();
    return current?.horizontal === "mixed" || current?.vertical === "mixed";
  };

  return (
    <div
      class="oasis-editor-table-cell-alignment-matrix"
      data-testid={props.testId}
      data-horizontal-state={alignmentState()?.horizontal ?? ""}
      data-vertical-state={alignmentState()?.vertical ?? ""}
      data-alignment-state={hasMixedAlignment() ? "mixed" : "uniform"}
      role="group"
      aria-label={t("table.alignmentSection")}
      aria-description={
        hasMixedAlignment() ? t("table.alignmentMixed") : undefined
      }
    >
      <For each={VERTICAL}>
        {(vertical, row): JSX.Element => (
          <For each={HORIZONTAL}>
            {(horizontal, column): JSX.Element => {
              const alignment: TableCellAlignment = {
                horizontal: horizontal.value,
                vertical: vertical.value,
              };
              const label = `${t(vertical.label)} ${t(horizontal.label)}`;
              const active = (): boolean => {
                const current = alignmentState();
                return (
                  current?.horizontal === horizontal.value &&
                  current.vertical === vertical.value
                );
              };
              return (
                <Button
                  class="oasis-editor-table-cell-alignment-option"
                  data-testid={`editor-toolbar-cell-align-${vertical.value}-${horizontal.value}`}
                  active={active()}
                  aria-label={label}
                  aria-pressed={active()}
                  title={label}
                  disabled={
                    !props.api.commands.state("tableSetCellAlignment").isEnabled
                  }
                  onMouseDown={(event): void => event.preventDefault()}
                  onClick={(): void => {
                    props.api.commands.execute(
                      "tableSetCellAlignment",
                      alignment,
                    );
                  }}
                >
                  <div
                    class="oasis-editor-table-cell-alignment-glyph"
                    aria-hidden="true"
                  >
                    <div
                      class="oasis-editor-table-cell-alignment-mark"
                      style={{
                        "grid-row": String(row() + 1),
                        "grid-column": String(column() + 1),
                      }}
                    />
                  </div>
                </Button>
              );
            }}
          </For>
        )}
      </For>
    </div>
  );
}
