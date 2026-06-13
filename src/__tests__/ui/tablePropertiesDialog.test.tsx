import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import {
  TablePropertiesDialog,
  type TablePropertiesDialogApplyValues,
  type TablePropertiesDialogInitialValues,
} from "../../ui/components/Dialogs/TablePropertiesDialog.js";
import { setLocale } from "../../i18n/index.js";

const initial: TablePropertiesDialogInitialValues = {
  activeTab: "table",
  tableWidth: "100",
  tableWidthUnit: "percent",
  tableAlign: "left",
  tableIndentLeft: "0",
  tableWrapping: "none",
  floatingSummary: "",
  rowHeight: "24",
  rowHeightRule: "atLeast",
  repeatHeader: false,
  allowBreakAcrossPages: true,
  hiddenRow: false,
  columnWidth: "120",
  cellWidth: "120",
  cellVerticalAlign: "top",
  cellTextDirection: "",
  cellNoWrap: false,
  cellFitText: false,
  cellHideMark: false,
  marginTop: "4",
  marginRight: "4",
  marginBottom: "4",
  marginLeft: "4",
  borderStyle: "none",
  borderWidth: "",
  borderColor: "",
  borderTop: false,
  borderRight: false,
  borderBottom: false,
  borderLeft: false,
  shading: "",
  altTitle: "",
  altDescription: "",
};

function mountDialog(
  overrides: Partial<{
    initial: TablePropertiesDialogInitialValues;
    onApply: (
      values: TablePropertiesDialogApplyValues,
      original: TablePropertiesDialogInitialValues,
    ) => void;
    onClose: () => void;
  }> = {},
) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const onApply = overrides.onApply ?? vi.fn();
  const onClose = overrides.onClose ?? vi.fn();
  const resolvedInitial = overrides.initial ?? initial;
  const dispose = render(
    () => (
      <TablePropertiesDialog
        isOpen
        initial={resolvedInitial}
        onClose={onClose}
        onApply={onApply}
      />
    ),
    host,
  );
  return { host, onApply, onClose, initial: resolvedInitial, dispose };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("TablePropertiesDialog", () => {
  it("emits table, row, column, cell, border and alt text values", () => {
    setLocale("en");
    const onApply = vi.fn();
    const { host, dispose } = mountDialog({ onApply });

    const tableWidth = host.querySelector(
      "[data-testid='editor-table-properties-table-width']",
    ) as HTMLInputElement;
    tableWidth.value = "80";
    tableWidth.dispatchEvent(new Event("input", { bubbles: true }));

    const rowTab = host.querySelector(
      "[data-testid='editor-table-properties-tab-row']",
    ) as HTMLButtonElement;
    rowTab.click();
    const repeatHeader = host.querySelector(
      "[data-testid='editor-table-properties-repeat-header']",
    ) as HTMLInputElement;
    repeatHeader.checked = true;
    repeatHeader.dispatchEvent(new Event("change", { bubbles: true }));
    const allowBreak = host.querySelector(
      "[data-testid='editor-table-properties-allow-break']",
    ) as HTMLInputElement;
    allowBreak.checked = false;
    allowBreak.dispatchEvent(new Event("change", { bubbles: true }));

    const columnTab = host.querySelector(
      "[data-testid='editor-table-properties-tab-column']",
    ) as HTMLButtonElement;
    columnTab.click();
    const columnWidth = host.querySelector(
      "[data-testid='editor-table-properties-column-width']",
    ) as HTMLInputElement;
    columnWidth.value = "144";
    columnWidth.dispatchEvent(new Event("input", { bubbles: true }));

    const cellTab = host.querySelector(
      "[data-testid='editor-table-properties-tab-cell']",
    ) as HTMLButtonElement;
    cellTab.click();
    const textDirection = host.querySelector(
      "[data-testid='editor-table-properties-cell-direction']",
    ) as HTMLSelectElement;
    textDirection.value = "tbRl";
    textDirection.dispatchEvent(new Event("change", { bubbles: true }));
    const borderStyle = host.querySelector(
      "[data-testid='editor-table-properties-border-style']",
    ) as HTMLSelectElement;
    borderStyle.value = "solid";
    borderStyle.dispatchEvent(new Event("change", { bubbles: true }));
    const shading = host.querySelector(
      "[data-testid='editor-table-properties-shading']",
    ) as HTMLInputElement;
    shading.value = "#ffeeaa";
    shading.dispatchEvent(new Event("input", { bubbles: true }));

    const altTab = host.querySelector(
      "[data-testid='editor-table-properties-tab-alt-text']",
    ) as HTMLButtonElement;
    altTab.click();
    const title = host.querySelector(
      "[data-testid='editor-table-properties-alt-title']",
    ) as HTMLInputElement;
    title.value = "Quarterly table";
    title.dispatchEvent(new Event("input", { bubbles: true }));

    const apply = host.querySelector(
      "[data-testid='editor-table-properties-apply']",
    ) as HTMLButtonElement;
    apply.click();

    const [values] = onApply.mock.calls[0] as [
      TablePropertiesDialogApplyValues,
      TablePropertiesDialogInitialValues,
    ];
    expect(values.tableWidth).toBe("80%");
    expect(values.repeatHeader).toBe(true);
    expect(values.cantSplit).toBe(true);
    expect(values.columnWidth).toBe(144);
    expect(values.cellTextDirection).toBe("tbRl");
    expect(values.borders.top).toEqual({
      type: "solid",
      width: 0.5,
      color: "#000000",
    });
    expect(values.shading).toBe("#ffeeaa");
    expect(values.altTitle).toBe("Quarterly table");
    dispose();
  });
});
