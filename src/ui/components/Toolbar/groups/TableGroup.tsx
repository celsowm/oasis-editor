import { Show } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";

import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { JSX } from "solid-js";

/** Table tools panel — command-driven; enablement derives from command state. */
export function TableGroup(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  const api = props.api;
  const disabled = (command: string): boolean => !api.commands.state(command).isEnabled;
  const selectionLabel = (): string | null =>
    api.commands.state("tableContext").value as string | null;

  return (
    <Menu
      icon="table-properties"
      testId="editor-toolbar-table-dropdown"
      tooltip={t("toolbar.table")}
      hideChevron
      panelClass="oasis-editor-toolbar-panel oasis-editor-toolbar-table-panel"
      keepMounted
    >
      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="combine"
          data-testid="editor-toolbar-merge-table"
          disabled={disabled("tableMerge")}
          onClick={(): unknown => api.commands.execute("tableMerge")}
          tooltip={t("table.mergeTooltip")}
        />
        <Button
          icon="split"
          data-testid="editor-toolbar-split-table"
          disabled={disabled("tableSplit")}
          onClick={(): unknown => api.commands.execute("tableSplit")}
          tooltip={t("table.splitTooltip")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="columns"
          data-testid="editor-toolbar-insert-table-column-before"
          disabled={disabled("tableInsertColumnBefore")}
          onClick={(): unknown => api.commands.execute("tableInsertColumnBefore")}
          tooltip={t("table.insertColumnLeft")}
        />
        <Button
          icon="columns"
          data-testid="editor-toolbar-insert-table-column-after"
          disabled={disabled("tableInsertColumnAfter")}
          onClick={(): unknown => api.commands.execute("tableInsertColumnAfter")}
          tooltip={t("table.insertColumnRight")}
        />
        <Button
          icon="trash-2"
          data-testid="editor-toolbar-delete-table-column"
          disabled={disabled("tableDeleteColumn")}
          onClick={(): unknown => api.commands.execute("tableDeleteColumn")}
          tooltip={t("table.deleteColumn")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="rows"
          data-testid="editor-toolbar-insert-table-row-before"
          disabled={disabled("tableInsertRowBefore")}
          onClick={(): unknown => api.commands.execute("tableInsertRowBefore")}
          tooltip={t("table.insertRowAbove")}
        />
        <Button
          icon="rows"
          data-testid="editor-toolbar-insert-table-row-after"
          disabled={disabled("tableInsertRowAfter")}
          onClick={(): unknown => api.commands.execute("tableInsertRowAfter")}
          tooltip={t("table.insertRowBelow")}
        />
        <Button
          icon="trash-2"
          data-testid="editor-toolbar-delete-table-row"
          disabled={disabled("tableDeleteRow")}
          onClick={(): unknown => api.commands.execute("tableDeleteRow")}
          tooltip={t("table.deleteRow")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="palette"
          data-testid="editor-toolbar-table-shading"
          onClick={(): void => {
            const color = prompt(t("table.cellBgColorPrompt"), "#f1f5f9");
            if (color !== null) api.commands.execute("tableCellShading", color);
          }}
          tooltip={t("table.cellColor")}
        />
        <Button
          icon="frame"
          data-testid="editor-toolbar-table-borders"
          onClick={(): unknown => api.commands.execute("tableCellBorders")}
          tooltip={t("table.applyBorders")}
        />
        <Button
          icon="square"
          data-testid="editor-toolbar-table-no-borders"
          onClick={(): unknown => api.commands.execute("tableCellNoBorders")}
          tooltip={t("table.removeBorders")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="maximize"
          data-testid="editor-toolbar-table-width-100"
          onClick={(): unknown => api.commands.execute("tableWidth100")}
          tooltip={t("table.width100Tooltip")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="align-left"
          data-testid="editor-toolbar-table-align-left"
          onClick={(): unknown => api.commands.execute("tableAlignLeft")}
          tooltip={t("table.alignLeft")}
        />
        <Button
          icon="align-center"
          data-testid="editor-toolbar-table-align-center"
          onClick={(): unknown => api.commands.execute("tableAlignCenter")}
          tooltip={t("table.alignCenter")}
        />
        <Button
          icon="align-right"
          data-testid="editor-toolbar-table-align-right"
          onClick={(): unknown => api.commands.execute("tableAlignRight")}
          tooltip={t("table.alignRight")}
        />
        <Button
          icon="move-horizontal"
          data-testid="editor-toolbar-table-cell-width"
          onClick={(): void => {
            const width = prompt(t("table.cellWidthPrompt"));
            if (width) api.commands.execute("tableSetCellWidth", width);
          }}
          tooltip={t("table.cellWidth")}
        />
      </div>

      <Show when={selectionLabel()}>
        {(label): JSX.Element => (
          <div
            class="oasis-editor-toolbar-badge"
            data-testid="editor-table-selection-label"
          >
            {label()}
          </div>
        )}
      </Show>
    </Menu>
  );
}
