import { For, type JSX } from "solid-js";
import type { TranslationKey } from "@/i18n/index.js";
import type { ToolbarActionApi } from "./schema/items.js";
import { Checkbox } from "@/ui/public/Checkbox.js";

const OPTIONS: Array<{ command: string; label: TranslationKey }> = [
  { command: "tableToggleHeaderRow", label: "table.headerRow" },
  { command: "tableToggleTotalRow", label: "table.totalRow" },
  { command: "tableToggleBandedRows", label: "table.bandedRows" },
  { command: "tableToggleFirstColumn", label: "table.firstColumn" },
  { command: "tableToggleLastColumn", label: "table.lastColumn" },
  { command: "tableToggleBandedColumns", label: "table.bandedColumns" },
];

export function TableStyleOptions(props: {
  api: ToolbarActionApi;
}): JSX.Element {
  return (
    <div class="oasis-editor-table-style-options" role="group">
      <For each={OPTIONS}>
        {(option): JSX.Element => {
          const state = (): boolean =>
            props.api.commands.state(option.command).isActive;
          return (
            <Checkbox
              class="oasis-editor-table-style-option"
              label={props.api.t(option.label)}
              checked={state()}
              disabled={!props.api.commands.state(option.command).isEnabled}
              onChange={(): void => {
                props.api.commands.execute(option.command);
              }}
            />
          );
        }}
      </For>
    </div>
  );
}
