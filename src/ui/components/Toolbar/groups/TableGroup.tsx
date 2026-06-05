import { Show } from "solid-js";
import { Button } from "../primitives/Button.js";
import { Menu } from "../primitives/Menu.js";
import { t } from "../../../../i18n/index.js";
import type { ToolbarActionApi } from "../schema/items.js";

/** Table tools panel — command-driven; enablement derives from command state. */
export function TableGroup(props: { api: ToolbarActionApi }) {
  const api = props.api;
  const disabled = (command: string) => !api.commands.state(command).isEnabled;
  const selectionLabel = () =>
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
          onClick={() => api.commands.execute("tableMerge")}
          tooltip={t("table.mergeTooltip")}
        />
        <Button
          icon="split"
          data-testid="editor-toolbar-split-table"
          disabled={disabled("tableSplit")}
          onClick={() => api.commands.execute("tableSplit")}
          tooltip={t("table.splitTooltip")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="columns"
          data-testid="editor-toolbar-insert-table-column-before"
          disabled={disabled("tableInsertColumnBefore")}
          onClick={() => api.commands.execute("tableInsertColumnBefore")}
          tooltip={t("table.insertColumnLeft")}
        />
        <Button
          icon="columns"
          data-testid="editor-toolbar-insert-table-column-after"
          disabled={disabled("tableInsertColumnAfter")}
          onClick={() => api.commands.execute("tableInsertColumnAfter")}
          tooltip={t("table.insertColumnRight")}
        />
        <Button
          icon="trash-2"
          data-testid="editor-toolbar-delete-table-column"
          disabled={disabled("tableDeleteColumn")}
          onClick={() => api.commands.execute("tableDeleteColumn")}
          tooltip={t("table.deleteColumn")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="rows"
          data-testid="editor-toolbar-insert-table-row-before"
          disabled={disabled("tableInsertRowBefore")}
          onClick={() => api.commands.execute("tableInsertRowBefore")}
          tooltip={t("table.insertRowAbove")}
        />
        <Button
          icon="rows"
          data-testid="editor-toolbar-insert-table-row-after"
          disabled={disabled("tableInsertRowAfter")}
          onClick={() => api.commands.execute("tableInsertRowAfter")}
          tooltip={t("table.insertRowBelow")}
        />
        <Button
          icon="trash-2"
          data-testid="editor-toolbar-delete-table-row"
          disabled={disabled("tableDeleteRow")}
          onClick={() => api.commands.execute("tableDeleteRow")}
          tooltip={t("table.deleteRow")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="palette"
          data-testid="editor-toolbar-table-shading"
          onClick={() => {
            const color = prompt(t("table.cellBgColorPrompt"), "#f1f5f9");
            if (color !== null) api.commands.execute("tableCellShading", color);
          }}
          tooltip={t("table.cellColor")}
        />
        <Button
          icon="frame"
          data-testid="editor-toolbar-table-borders"
          onClick={() => api.commands.execute("tableCellBorders")}
          tooltip={t("table.applyBorders")}
        />
        <Button
          icon="square"
          data-testid="editor-toolbar-table-no-borders"
          onClick={() => api.commands.execute("tableCellNoBorders")}
          tooltip={t("table.removeBorders")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="maximize"
          data-testid="editor-toolbar-table-width-100"
          onClick={() => api.commands.execute("tableWidth100")}
          tooltip={t("table.width100Tooltip")}
        />
      </div>

      <div class="oasis-editor-toolbar-panel-section oasis-editor-toolbar-panel-actions">
        <Button
          icon="align-left"
          data-testid="editor-toolbar-table-align-left"
          onClick={() => api.commands.execute("tableAlignLeft")}
          tooltip={t("table.alignLeft")}
        />
        <Button
          icon="align-center"
          data-testid="editor-toolbar-table-align-center"
          onClick={() => api.commands.execute("tableAlignCenter")}
          tooltip={t("table.alignCenter")}
        />
        <Button
          icon="align-right"
          data-testid="editor-toolbar-table-align-right"
          onClick={() => api.commands.execute("tableAlignRight")}
          tooltip={t("table.alignRight")}
        />
        <Button
          icon="move-horizontal"
          data-testid="editor-toolbar-table-cell-width"
          onClick={() => {
            const width = prompt(t("table.cellWidthPrompt"));
            if (width) api.commands.execute("tableSetCellWidth", width);
          }}
          tooltip={t("table.cellWidth")}
        />
      </div>

      <Show when={selectionLabel()}>
        {(label) => (
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
