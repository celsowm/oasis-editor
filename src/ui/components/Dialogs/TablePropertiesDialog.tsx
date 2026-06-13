import { createEffect, createMemo, createSignal } from "solid-js";
import { Dialog } from "./Dialog.js";
import { Tabs } from "../Tabs/Tabs.js";
import { t } from "../../../i18n/index.js";
import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorTableRowHeightRule,
} from "../../../core/model.js";

type TableWidthUnit = "points" | "percent";
type BorderStyleValue = "none" | "solid" | "dashed" | "dotted";

export interface TablePropertiesDialogInitialValues {
  activeTab?: "table" | "row" | "column" | "cell" | "altText";
  tableWidth: string;
  tableWidthUnit: TableWidthUnit;
  tableAlign: "" | "left" | "center" | "right";
  tableIndentLeft: string;
  tableWrapping: "none" | "around";
  floatingSummary: string;
  rowHeight: string;
  rowHeightRule: EditorTableRowHeightRule | "";
  repeatHeader: boolean;
  allowBreakAcrossPages: boolean;
  hiddenRow: boolean;
  columnWidth: string;
  cellWidth: string;
  cellVerticalAlign: "" | "top" | "middle" | "bottom";
  cellTextDirection: "" | "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV";
  cellNoWrap: boolean;
  cellFitText: boolean;
  cellHideMark: boolean;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  borderStyle: BorderStyleValue;
  borderWidth: string;
  borderColor: string;
  borderTop: boolean;
  borderRight: boolean;
  borderBottom: boolean;
  borderLeft: boolean;
  shading: string;
  altTitle: string;
  altDescription: string;
}

export interface TablePropertiesDialogBorders {
  top: EditorBorderStyle | null;
  right: EditorBorderStyle | null;
  bottom: EditorBorderStyle | null;
  left: EditorBorderStyle | null;
}

export interface TablePropertiesDialogApplyValues {
  tableWidth: EditorDocxWidthValue | null;
  tableAlign: "left" | "center" | "right" | null;
  tableIndentLeft: EditorDocxWidthValue | null;
  rowHeight: EditorDocxWidthValue | null;
  rowHeightRule: EditorTableRowHeightRule | null;
  repeatHeader: boolean;
  cantSplit: boolean;
  hiddenRow: boolean;
  columnWidth: EditorDocxWidthValue | null;
  cellWidth: EditorDocxWidthValue | null;
  cellVerticalAlign: "top" | "middle" | "bottom" | null;
  cellTextDirection: "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | null;
  cellNoWrap: boolean | null;
  cellFitText: boolean | null;
  cellHideMark: boolean | null;
  margins: {
    top: number | null;
    right: number | null;
    bottom: number | null;
    left: number | null;
  };
  borders: TablePropertiesDialogBorders;
  shading: string | null;
  altTitle: string | null;
  altDescription: string | null;
}

export interface TablePropertiesDialogProps {
  isOpen: boolean;
  initial: TablePropertiesDialogInitialValues;
  onClose: () => void;
  onApply: (
    values: TablePropertiesDialogApplyValues,
    original: TablePropertiesDialogInitialValues,
  ) => void;
}

const DEFAULT_BORDER_WIDTH_PT = 0.5;
const DEFAULT_BORDER_COLOR = "#000000";

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWidth(value: string, unit: TableWidthUnit): EditorDocxWidthValue | null {
  const parsed = parseNumber(value);
  if (parsed === null) return null;
  return unit === "percent" ? `${parsed}%` : parsed;
}

function resolveBorder(
  style: BorderStyleValue,
  widthValue: string,
  colorValue: string,
): EditorBorderStyle | null {
  if (style === "none") return null;
  const width = parseNumber(widthValue);
  return {
    type: style,
    width: width !== null && width > 0 ? width : DEFAULT_BORDER_WIDTH_PT,
    color: colorValue.trim() || DEFAULT_BORDER_COLOR,
  };
}

export function TablePropertiesDialog(props: TablePropertiesDialogProps) {
  const [activeTab, setActiveTab] = createSignal("table");
  const [tableWidth, setTableWidth] = createSignal("");
  const [tableWidthUnit, setTableWidthUnit] =
    createSignal<TableWidthUnit>("points");
  const [tableAlign, setTableAlign] =
    createSignal<TablePropertiesDialogInitialValues["tableAlign"]>("");
  const [tableIndentLeft, setTableIndentLeft] = createSignal("");
  const [tableWrapping, setTableWrapping] =
    createSignal<TablePropertiesDialogInitialValues["tableWrapping"]>("none");
  const [rowHeight, setRowHeight] = createSignal("");
  const [rowHeightRule, setRowHeightRule] =
    createSignal<TablePropertiesDialogInitialValues["rowHeightRule"]>("");
  const [repeatHeader, setRepeatHeader] = createSignal(false);
  const [allowBreakAcrossPages, setAllowBreakAcrossPages] = createSignal(true);
  const [hiddenRow, setHiddenRow] = createSignal(false);
  const [columnWidth, setColumnWidth] = createSignal("");
  const [cellWidth, setCellWidth] = createSignal("");
  const [cellVerticalAlign, setCellVerticalAlign] =
    createSignal<TablePropertiesDialogInitialValues["cellVerticalAlign"]>("");
  const [cellTextDirection, setCellTextDirection] =
    createSignal<TablePropertiesDialogInitialValues["cellTextDirection"]>("");
  const [cellNoWrap, setCellNoWrap] = createSignal(false);
  const [cellFitText, setCellFitText] = createSignal(false);
  const [cellHideMark, setCellHideMark] = createSignal(false);
  const [marginTop, setMarginTop] = createSignal("");
  const [marginRight, setMarginRight] = createSignal("");
  const [marginBottom, setMarginBottom] = createSignal("");
  const [marginLeft, setMarginLeft] = createSignal("");
  const [borderStyle, setBorderStyle] =
    createSignal<BorderStyleValue>("none");
  const [borderWidth, setBorderWidth] = createSignal("");
  const [borderColor, setBorderColor] = createSignal("");
  const [borderTop, setBorderTop] = createSignal(false);
  const [borderRight, setBorderRight] = createSignal(false);
  const [borderBottom, setBorderBottom] = createSignal(false);
  const [borderLeft, setBorderLeft] = createSignal(false);
  const [shading, setShading] = createSignal("");
  const [altTitle, setAltTitle] = createSignal("");
  const [altDescription, setAltDescription] = createSignal("");

  createEffect(() => {
    if (!props.isOpen) return;
    setActiveTab(props.initial.activeTab ?? "table");
    setTableWidth(props.initial.tableWidth);
    setTableWidthUnit(props.initial.tableWidthUnit);
    setTableAlign(props.initial.tableAlign);
    setTableIndentLeft(props.initial.tableIndentLeft);
    setTableWrapping(props.initial.tableWrapping);
    setRowHeight(props.initial.rowHeight);
    setRowHeightRule(props.initial.rowHeightRule);
    setRepeatHeader(props.initial.repeatHeader);
    setAllowBreakAcrossPages(props.initial.allowBreakAcrossPages);
    setHiddenRow(props.initial.hiddenRow);
    setColumnWidth(props.initial.columnWidth);
    setCellWidth(props.initial.cellWidth);
    setCellVerticalAlign(props.initial.cellVerticalAlign);
    setCellTextDirection(props.initial.cellTextDirection);
    setCellNoWrap(props.initial.cellNoWrap);
    setCellFitText(props.initial.cellFitText);
    setCellHideMark(props.initial.cellHideMark);
    setMarginTop(props.initial.marginTop);
    setMarginRight(props.initial.marginRight);
    setMarginBottom(props.initial.marginBottom);
    setMarginLeft(props.initial.marginLeft);
    setBorderStyle(props.initial.borderStyle);
    setBorderWidth(props.initial.borderWidth);
    setBorderColor(props.initial.borderColor);
    setBorderTop(props.initial.borderTop);
    setBorderRight(props.initial.borderRight);
    setBorderBottom(props.initial.borderBottom);
    setBorderLeft(props.initial.borderLeft);
    setShading(props.initial.shading);
    setAltTitle(props.initial.altTitle);
    setAltDescription(props.initial.altDescription);
  });

  const borderPreview = createMemo(() => {
    const border = resolveBorder(borderStyle(), borderWidth(), borderColor());
    const css = border
      ? `${border.width}pt ${border.type} ${border.color}`
      : undefined;
    return {
      "background-color": shading().trim() || undefined,
      "border-top": css && borderTop() ? css : "1px solid #dadce0",
      "border-right": css && borderRight() ? css : "1px solid #dadce0",
      "border-bottom": css && borderBottom() ? css : "1px solid #dadce0",
      "border-left": css && borderLeft() ? css : "1px solid #dadce0",
    };
  });

  const handleApply = () => {
    const border = resolveBorder(borderStyle(), borderWidth(), borderColor());
    props.onApply(
      {
        tableWidth: parseWidth(tableWidth(), tableWidthUnit()),
        tableAlign: tableAlign() || null,
        tableIndentLeft: parseWidth(tableIndentLeft(), "points"),
        rowHeight: parseWidth(rowHeight(), "points"),
        rowHeightRule: rowHeightRule() || null,
        repeatHeader: repeatHeader(),
        cantSplit: !allowBreakAcrossPages(),
        hiddenRow: hiddenRow(),
        columnWidth: parseWidth(columnWidth(), "points"),
        cellWidth: parseWidth(cellWidth(), "points"),
        cellVerticalAlign: cellVerticalAlign() || null,
        cellTextDirection: cellTextDirection() || null,
        cellNoWrap: cellNoWrap(),
        cellFitText: cellFitText(),
        cellHideMark: cellHideMark(),
        margins: {
          top: parseNumber(marginTop()),
          right: parseNumber(marginRight()),
          bottom: parseNumber(marginBottom()),
          left: parseNumber(marginLeft()),
        },
        borders: {
          top: borderTop() ? border : null,
          right: borderRight() ? border : null,
          bottom: borderBottom() ? border : null,
          left: borderLeft() ? border : null,
        },
        shading: shading().trim() || null,
        altTitle: altTitle().trim() || null,
        altDescription: altDescription().trim() || null,
      },
      props.initial,
    );
    props.onClose();
  };

  const numericInput = (
    label: string,
    value: () => string,
    setter: (value: string) => void,
    testId: string,
    disabled = false,
  ) => (
    <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
      <label class="oasis-editor-dialog-label">{label}</label>
      <input
        type="number"
        class="oasis-editor-dialog-input"
        min="0"
        step="1"
        value={value()}
        disabled={disabled}
        onInput={(e) => setter(e.currentTarget.value)}
        data-testid={testId}
      />
    </div>
  );

  const checkbox = (
    label: string,
    checked: () => boolean,
    setter: (value: boolean) => void,
    testId: string,
    disabled = false,
  ) => (
    <label class="oasis-editor-dialog-style-toggle">
      <input
        type="checkbox"
        checked={checked()}
        disabled={disabled}
        onChange={(e) => setter(e.currentTarget.checked)}
        data-testid={testId}
      />
      {label}
    </label>
  );

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("table.propertiesTitle")}
      onClose={props.onClose}
      size="lg"
      class="oasis-editor-table-properties-dialog"
      bodyClass="oasis-editor-table-properties-body"
      footer={
        <>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
            onClick={props.onClose}
            data-testid="editor-table-properties-cancel"
          >
            {t("generic.cancel")}
          </button>
          <button
            class="oasis-editor-dialog-button oasis-editor-dialog-button-primary"
            onClick={handleApply}
            data-testid="editor-table-properties-apply"
          >
            {t("generic.ok")}
          </button>
        </>
      }
    >
      <Tabs
        value={activeTab()}
        onChange={setActiveTab}
        ariaLabel={t("table.propertiesTitle")}
        class="oasis-editor-table-properties-tabs"
        items={[
          {
            id: "table",
            label: t("table.tabTable"),
            testId: "editor-table-properties-tab-table",
            panel: (
              <div class="oasis-editor-table-properties-panel">
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("table.sizeSection")}</legend>
                  <div class="oasis-editor-dialog-row">
                    {numericInput(
                      t("table.preferredWidth"),
                      tableWidth,
                      setTableWidth,
                      "editor-table-properties-table-width",
                    )}
                    <div class="oasis-editor-dialog-input-group">
                      <label class="oasis-editor-dialog-label">
                        {t("table.measureIn")}
                      </label>
                      <select
                        class="oasis-editor-dialog-input"
                        value={tableWidthUnit()}
                        onChange={(e) =>
                          setTableWidthUnit(e.currentTarget.value as TableWidthUnit)
                        }
                        data-testid="editor-table-properties-table-width-unit"
                      >
                        <option value="points">{t("table.points")}</option>
                        <option value="percent">{t("table.percent")}</option>
                      </select>
                    </div>
                  </div>
                </fieldset>
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("table.alignmentSection")}</legend>
                  <div class="oasis-editor-dialog-style-row">
                    {(["left", "center", "right"] as const).map((align) => (
                      <label class="oasis-editor-dialog-style-toggle">
                        <input
                          type="radio"
                          name="table-align"
                          checked={tableAlign() === align}
                          onChange={() => setTableAlign(align)}
                          data-testid={`editor-table-properties-align-${align}`}
                        />
                        {t(`table.align${align[0]!.toUpperCase()}${align.slice(1)}` as any)}
                      </label>
                    ))}
                  </div>
                  <div class="oasis-editor-dialog-row">
                    {numericInput(
                      t("table.indentFromLeft"),
                      tableIndentLeft,
                      setTableIndentLeft,
                      "editor-table-properties-indent-left",
                    )}
                  </div>
                </fieldset>
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("table.textWrappingSection")}</legend>
                  <div class="oasis-editor-dialog-style-row">
                    {checkbox(
                      t("table.wrapNone"),
                      () => tableWrapping() === "none",
                      () => setTableWrapping("none"),
                      "editor-table-properties-wrap-none",
                    )}
                    {checkbox(
                      t("table.wrapAround"),
                      () => tableWrapping() === "around",
                      () => setTableWrapping("around"),
                      "editor-table-properties-wrap-around",
                      !props.initial.floatingSummary,
                    )}
                    <button
                      type="button"
                      class="oasis-editor-dialog-button oasis-editor-dialog-button-secondary"
                      disabled
                      data-testid="editor-table-properties-positioning"
                    >
                      {t("table.positioning")}
                    </button>
                  </div>
                  <div class="oasis-editor-dialog-help-text">
                    {props.initial.floatingSummary || t("table.positioningReadOnly")}
                  </div>
                </fieldset>
              </div>
            ),
          },
          {
            id: "row",
            label: t("table.tabRow"),
            testId: "editor-table-properties-tab-row",
            panel: (
              <div class="oasis-editor-table-properties-panel">
                <div class="oasis-editor-dialog-row">
                  {numericInput(
                    t("table.rowHeight"),
                    rowHeight,
                    setRowHeight,
                    "editor-table-properties-row-height",
                  )}
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("table.rowHeightRule")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={rowHeightRule()}
                      onChange={(e) =>
                        setRowHeightRule(
                          e.currentTarget.value as TablePropertiesDialogInitialValues["rowHeightRule"],
                        )
                      }
                      data-testid="editor-table-properties-row-height-rule"
                    >
                      <option value="">{t("table.rowAuto")}</option>
                      <option value="atLeast">{t("table.rowAtLeast")}</option>
                      <option value="exact">{t("table.rowExactly")}</option>
                    </select>
                  </div>
                </div>
                <div class="oasis-editor-dialog-style-row">
                  {checkbox(
                    t("table.repeatHeader"),
                    repeatHeader,
                    setRepeatHeader,
                    "editor-table-properties-repeat-header",
                  )}
                  {checkbox(
                    t("table.allowBreakAcrossPages"),
                    allowBreakAcrossPages,
                    setAllowBreakAcrossPages,
                    "editor-table-properties-allow-break",
                  )}
                  {checkbox(
                    t("table.hiddenRow"),
                    hiddenRow,
                    setHiddenRow,
                    "editor-table-properties-hidden-row",
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "column",
            label: t("table.tabColumn"),
            testId: "editor-table-properties-tab-column",
            panel: (
              <div class="oasis-editor-table-properties-panel">
                <div class="oasis-editor-dialog-row">
                  {numericInput(
                    t("table.columnWidth"),
                    columnWidth,
                    setColumnWidth,
                    "editor-table-properties-column-width",
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "cell",
            label: t("table.tabCell"),
            testId: "editor-table-properties-tab-cell",
            panel: (
              <div class="oasis-editor-table-properties-panel">
                <div class="oasis-editor-dialog-row">
                  {numericInput(
                    t("table.cellWidth"),
                    cellWidth,
                    setCellWidth,
                    "editor-table-properties-cell-width",
                  )}
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("table.verticalAlignment")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={cellVerticalAlign()}
                      onChange={(e) =>
                        setCellVerticalAlign(
                          e.currentTarget.value as TablePropertiesDialogInitialValues["cellVerticalAlign"],
                        )
                      }
                      data-testid="editor-table-properties-cell-valign"
                    >
                      <option value="">{t("table.inherit")}</option>
                      <option value="top">{t("table.valignTop")}</option>
                      <option value="middle">{t("table.valignMiddle")}</option>
                      <option value="bottom">{t("table.valignBottom")}</option>
                    </select>
                  </div>
                  <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                    <label class="oasis-editor-dialog-label">
                      {t("table.textDirection")}
                    </label>
                    <select
                      class="oasis-editor-dialog-input"
                      value={cellTextDirection()}
                      onChange={(e) =>
                        setCellTextDirection(
                          e.currentTarget.value as TablePropertiesDialogInitialValues["cellTextDirection"],
                        )
                      }
                      data-testid="editor-table-properties-cell-direction"
                    >
                      <option value="">{t("table.inherit")}</option>
                      <option value="lrTb">lrTb</option>
                      <option value="tbRl">tbRl</option>
                      <option value="btLr">btLr</option>
                      <option value="lrTbV">lrTbV</option>
                      <option value="tbRlV">tbRlV</option>
                    </select>
                  </div>
                </div>
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("table.options")}</legend>
                  <div class="oasis-editor-dialog-style-row">
                    {checkbox(
                      t("table.noWrap"),
                      cellNoWrap,
                      setCellNoWrap,
                      "editor-table-properties-cell-nowrap",
                    )}
                    {checkbox(
                      t("table.fitText"),
                      cellFitText,
                      setCellFitText,
                      "editor-table-properties-cell-fit-text",
                    )}
                    {checkbox(
                      t("table.hideMark"),
                      cellHideMark,
                      setCellHideMark,
                      "editor-table-properties-cell-hide-mark",
                    )}
                  </div>
                </fieldset>
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("table.cellMargins")}</legend>
                  <div class="oasis-editor-dialog-row">
                    {numericInput(t("paragraph.borderSideTop"), marginTop, setMarginTop, "editor-table-properties-margin-top")}
                    {numericInput(t("paragraph.borderSideRight"), marginRight, setMarginRight, "editor-table-properties-margin-right")}
                    {numericInput(t("paragraph.borderSideBottom"), marginBottom, setMarginBottom, "editor-table-properties-margin-bottom")}
                    {numericInput(t("paragraph.borderSideLeft"), marginLeft, setMarginLeft, "editor-table-properties-margin-left")}
                  </div>
                </fieldset>
                <fieldset class="oasis-editor-font-dialog-fieldset">
                  <legend>{t("paragraph.bordersSection")}</legend>
                  <div class="oasis-editor-dialog-row">
                    <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
                      <label class="oasis-editor-dialog-label">
                        {t("paragraph.borderStyleLabel")}
                      </label>
                      <select
                        class="oasis-editor-dialog-input"
                        value={borderStyle()}
                        onChange={(e) => {
                          const next = e.currentTarget.value as BorderStyleValue;
                          setBorderStyle(next);
                          if (next === "none") {
                            setBorderTop(false);
                            setBorderRight(false);
                            setBorderBottom(false);
                            setBorderLeft(false);
                          } else if (
                            !borderTop() &&
                            !borderRight() &&
                            !borderBottom() &&
                            !borderLeft()
                          ) {
                            setBorderTop(true);
                            setBorderRight(true);
                            setBorderBottom(true);
                            setBorderLeft(true);
                          }
                        }}
                        data-testid="editor-table-properties-border-style"
                      >
                        <option value="none">{t("paragraph.borderNone")}</option>
                        <option value="solid">{t("paragraph.borderSolid")}</option>
                        <option value="dashed">{t("paragraph.borderDashed")}</option>
                        <option value="dotted">{t("paragraph.borderDotted")}</option>
                      </select>
                    </div>
                    {numericInput(
                      t("paragraph.borderWidthLabel"),
                      borderWidth,
                      setBorderWidth,
                      "editor-table-properties-border-width",
                      borderStyle() === "none",
                    )}
                    <div class="oasis-editor-dialog-input-group">
                      <label class="oasis-editor-dialog-label">
                        {t("paragraph.borderColorLabel")}
                      </label>
                      <input
                        type="color"
                        class="oasis-editor-dialog-input"
                        value={borderColor() || DEFAULT_BORDER_COLOR}
                        disabled={borderStyle() === "none"}
                        onInput={(e) => setBorderColor(e.currentTarget.value)}
                        data-testid="editor-table-properties-border-color"
                      />
                    </div>
                    <div class="oasis-editor-dialog-input-group">
                      <label class="oasis-editor-dialog-label">
                        {t("paragraph.shadingLabel")}
                      </label>
                      <input
                        type="color"
                        class="oasis-editor-dialog-input"
                        value={shading() || "#ffffff"}
                        onInput={(e) => setShading(e.currentTarget.value)}
                        data-testid="editor-table-properties-shading"
                      />
                    </div>
                  </div>
                  <div class="oasis-editor-dialog-style-row">
                    {checkbox(t("paragraph.borderSideTop"), borderTop, setBorderTop, "editor-table-properties-border-top", borderStyle() === "none")}
                    {checkbox(t("paragraph.borderSideRight"), borderRight, setBorderRight, "editor-table-properties-border-right", borderStyle() === "none")}
                    {checkbox(t("paragraph.borderSideBottom"), borderBottom, setBorderBottom, "editor-table-properties-border-bottom", borderStyle() === "none")}
                    {checkbox(t("paragraph.borderSideLeft"), borderLeft, setBorderLeft, "editor-table-properties-border-left", borderStyle() === "none")}
                  </div>
                  <div
                    class="oasis-editor-table-properties-cell-preview"
                    style={borderPreview()}
                    data-testid="editor-table-properties-cell-preview"
                  />
                </fieldset>
              </div>
            ),
          },
          {
            id: "altText",
            label: t("table.tabAltText"),
            testId: "editor-table-properties-tab-alt-text",
            panel: (
              <div class="oasis-editor-table-properties-panel">
                <div class="oasis-editor-dialog-input-group">
                  <label class="oasis-editor-dialog-label">
                    {t("table.altTitle")}
                  </label>
                  <input
                    class="oasis-editor-dialog-input"
                    value={altTitle()}
                    onInput={(e) => setAltTitle(e.currentTarget.value)}
                    data-testid="editor-table-properties-alt-title"
                  />
                </div>
                <div class="oasis-editor-dialog-input-group">
                  <label class="oasis-editor-dialog-label">
                    {t("table.altDescription")}
                  </label>
                  <textarea
                    class="oasis-editor-dialog-input oasis-editor-table-properties-textarea"
                    value={altDescription()}
                    onInput={(e) => setAltDescription(e.currentTarget.value)}
                    data-testid="editor-table-properties-alt-description"
                  />
                </div>
              </div>
            ),
          },
        ]}
      />
    </Dialog>
  );
}
