import { createEffect, createMemo, Show } from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import type { SetStoreFunction } from "solid-js/store";
import { useI18n } from "@/i18n/I18nContext.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";
import { Tabs } from "@/ui/components/Tabs/Tabs.js";

import type {
  EditorBorderStyle,
  EditorDocxWidthValue,
  EditorTableRowHeightRule,
  EditorTableFloatingLayout,
} from "@/core/model.js";

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
  floatingHorizontalAnchor: "margin" | "page" | "text";
  floatingVerticalAnchor: "margin" | "page" | "text";
  floatingX: string;
  floatingY: string;
  floatingXAlign: "" | "left" | "center" | "right" | "inside" | "outside";
  floatingYAlign: "" | "top" | "center" | "bottom" | "inside" | "outside";
  floatingDistanceTop: string;
  floatingDistanceRight: string;
  floatingDistanceBottom: string;
  floatingDistanceLeft: string;
  floatingOverlap: "overlap" | "never";
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
  borderStart: boolean;
  borderEnd: boolean;
  borderTopLeftToBottomRight: boolean;
  borderTopRightToBottomLeft: boolean;
  shading: string;
  altTitle: string;
  altDescription: string;
}

export interface TablePropertiesDialogBorders {
  top: EditorBorderStyle | null;
  right: EditorBorderStyle | null;
  bottom: EditorBorderStyle | null;
  left: EditorBorderStyle | null;
  start: EditorBorderStyle | null;
  end: EditorBorderStyle | null;
  topLeftToBottomRight: EditorBorderStyle | null;
  topRightToBottomLeft: EditorBorderStyle | null;
}

export interface TablePropertiesDialogApplyValues {
  tableWidth: EditorDocxWidthValue | null;
  tableAlign: "left" | "center" | "right" | null;
  tableIndentLeft: EditorDocxWidthValue | null;
  tableFloating: EditorTableFloatingLayout | null;
  tableOverlap: "overlap" | "never" | null;
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

function parseWidth(
  value: string,
  unit: TableWidthUnit,
): EditorDocxWidthValue | null {
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

// Reusable input factories (module-level; no component-scope captures needed).
function numericInput(
  label: string,
  value: () => string,
  setter: (value: string) => void,
  testId: string,
  disabled = false,
  allowNegative = false,
) {
  return (
    <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
      <label class="oasis-editor-dialog-label">{label}</label>
      <input
        type="number"
        class="oasis-editor-dialog-input"
        min={allowNegative ? undefined : "0"}
        step="1"
        value={value()}
        disabled={disabled}
        onInput={(e) => setter(e.currentTarget.value)}
        data-testid={testId}
      />
    </div>
  );
}

function checkbox(
  label: string,
  checked: () => boolean,
  setter: (value: boolean) => void,
  testId: string,
  disabled = false,
) {
  return (
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
}

// Single reactive store replacing 40+ individual signals.
interface TableFormState {
  activeTab: string;
  tableWidth: string;
  tableWidthUnit: TableWidthUnit;
  tableAlign: TablePropertiesDialogInitialValues["tableAlign"];
  tableIndentLeft: string;
  tableWrapping: TablePropertiesDialogInitialValues["tableWrapping"];
  floatingHorizontalAnchor: TablePropertiesDialogInitialValues["floatingHorizontalAnchor"];
  floatingVerticalAnchor: TablePropertiesDialogInitialValues["floatingVerticalAnchor"];
  floatingX: string;
  floatingY: string;
  floatingXAlign: TablePropertiesDialogInitialValues["floatingXAlign"];
  floatingYAlign: TablePropertiesDialogInitialValues["floatingYAlign"];
  floatingDistanceTop: string;
  floatingDistanceRight: string;
  floatingDistanceBottom: string;
  floatingDistanceLeft: string;
  floatingOverlap: TablePropertiesDialogInitialValues["floatingOverlap"];
  rowHeight: string;
  rowHeightRule: TablePropertiesDialogInitialValues["rowHeightRule"];
  repeatHeader: boolean;
  allowBreakAcrossPages: boolean;
  hiddenRow: boolean;
  columnWidth: string;
  cellWidth: string;
  cellVerticalAlign: TablePropertiesDialogInitialValues["cellVerticalAlign"];
  cellTextDirection: TablePropertiesDialogInitialValues["cellTextDirection"];
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
  borderStart: boolean;
  borderEnd: boolean;
  borderTlBr: boolean;
  borderTrBl: boolean;
  shading: string;
  altTitle: string;
  altDescription: string;
}

interface TabPanelProps {
  form: TableFormState;
  set: SetStoreFunction<TableFormState>;
}

function TableTabPanel(p: TabPanelProps) {
  const t = useI18n();
  return (
    <div class="oasis-editor-table-properties-panel">
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.sizeSection")}</legend>
        <div class="oasis-editor-dialog-row">
          {numericInput(
            t("table.preferredWidth"),
            () => p.form.tableWidth,
            (v) => p.set("tableWidth", v),
            "editor-table-properties-table-width",
          )}
          <div class="oasis-editor-dialog-input-group">
            <label class="oasis-editor-dialog-label">
              {t("table.measureIn")}
            </label>
            <select
              class="oasis-editor-dialog-input"
              value={p.form.tableWidthUnit}
              onChange={(e) =>
                p.set("tableWidthUnit", e.currentTarget.value as TableWidthUnit)
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
                checked={p.form.tableAlign === align}
                onChange={() => p.set("tableAlign", align)}
                data-testid={`editor-table-properties-align-${align}`}
              />
              {t(
                `table.align${align[0]!.toUpperCase()}${align.slice(1)}` as any,
              )}
            </label>
          ))}
        </div>
        <div class="oasis-editor-dialog-row">
          {numericInput(
            t("table.indentFromLeft"),
            () => p.form.tableIndentLeft,
            (v) => p.set("tableIndentLeft", v),
            "editor-table-properties-indent-left",
          )}
        </div>
      </fieldset>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.textWrappingSection")}</legend>
        <div class="oasis-editor-dialog-style-row">
          {checkbox(
            t("table.wrapNone"),
            () => p.form.tableWrapping === "none",
            () => p.set("tableWrapping", "none"),
            "editor-table-properties-wrap-none",
          )}
          {checkbox(
            t("table.wrapAround"),
            () => p.form.tableWrapping === "around",
            () => p.set("tableWrapping", "around"),
            "editor-table-properties-wrap-around",
          )}
        </div>
        <Show when={p.form.tableWrapping === "around"}>
          <div class="oasis-editor-dialog-row">
            <label class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
              <span class="oasis-editor-dialog-label">
                {t("table.horizontalAnchor")}
              </span>
              <select
                class="oasis-editor-dialog-input"
                value={p.form.floatingHorizontalAnchor}
                onChange={(e) =>
                  p.set(
                    "floatingHorizontalAnchor",
                    e.currentTarget
                      .value as TablePropertiesDialogInitialValues["floatingHorizontalAnchor"],
                  )
                }
                data-testid="editor-table-properties-floating-h-anchor"
              >
                <option value="margin">{t("table.anchorMargin")}</option>
                <option value="page">{t("table.anchorPage")}</option>
                <option value="text">{t("table.anchorText")}</option>
              </select>
            </label>
            <label class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
              <span class="oasis-editor-dialog-label">
                {t("table.verticalAnchor")}
              </span>
              <select
                class="oasis-editor-dialog-input"
                value={p.form.floatingVerticalAnchor}
                onChange={(e) =>
                  p.set(
                    "floatingVerticalAnchor",
                    e.currentTarget
                      .value as TablePropertiesDialogInitialValues["floatingVerticalAnchor"],
                  )
                }
                data-testid="editor-table-properties-floating-v-anchor"
              >
                <option value="margin">{t("table.anchorMargin")}</option>
                <option value="page">{t("table.anchorPage")}</option>
                <option value="text">{t("table.anchorText")}</option>
              </select>
            </label>
          </div>
          <div class="oasis-editor-dialog-row">
            {numericInput(
              t("table.positionX"),
              () => p.form.floatingX,
              (v) => p.set("floatingX", v),
              "editor-table-properties-floating-x",
              Boolean(p.form.floatingXAlign),
              true,
            )}
            {numericInput(
              t("table.positionY"),
              () => p.form.floatingY,
              (v) => p.set("floatingY", v),
              "editor-table-properties-floating-y",
              Boolean(p.form.floatingYAlign),
              true,
            )}
            <label class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
              <span class="oasis-editor-dialog-label">
                {t("table.horizontalAlignment")}
              </span>
              <select
                class="oasis-editor-dialog-input"
                value={p.form.floatingXAlign}
                onChange={(e) =>
                  p.set(
                    "floatingXAlign",
                    e.currentTarget
                      .value as TablePropertiesDialogInitialValues["floatingXAlign"],
                  )
                }
                data-testid="editor-table-properties-floating-x-align"
              >
                <option value="">{t("table.explicitOffset")}</option>
                {(
                  ["left", "center", "right", "inside", "outside"] as const
                ).map((value) => (
                  <option value={value}>{value}</option>
                ))}
              </select>
            </label>
            <label class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
              <span class="oasis-editor-dialog-label">
                {t("table.verticalAlignment")}
              </span>
              <select
                class="oasis-editor-dialog-input"
                value={p.form.floatingYAlign}
                onChange={(e) =>
                  p.set(
                    "floatingYAlign",
                    e.currentTarget
                      .value as TablePropertiesDialogInitialValues["floatingYAlign"],
                  )
                }
                data-testid="editor-table-properties-floating-y-align"
              >
                <option value="">{t("table.explicitOffset")}</option>
                {(
                  ["top", "center", "bottom", "inside", "outside"] as const
                ).map((value) => (
                  <option value={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <div class="oasis-editor-dialog-row">
            {numericInput(
              t("table.distanceTop"),
              () => p.form.floatingDistanceTop,
              (v) => p.set("floatingDistanceTop", v),
              "editor-table-properties-floating-distance-top",
            )}
            {numericInput(
              t("table.distanceRight"),
              () => p.form.floatingDistanceRight,
              (v) => p.set("floatingDistanceRight", v),
              "editor-table-properties-floating-distance-right",
            )}
            {numericInput(
              t("table.distanceBottom"),
              () => p.form.floatingDistanceBottom,
              (v) => p.set("floatingDistanceBottom", v),
              "editor-table-properties-floating-distance-bottom",
            )}
            {numericInput(
              t("table.distanceLeft"),
              () => p.form.floatingDistanceLeft,
              (v) => p.set("floatingDistanceLeft", v),
              "editor-table-properties-floating-distance-left",
            )}
          </div>
          {checkbox(
            t("table.allowOverlap"),
            () => p.form.floatingOverlap === "overlap",
            (value) => p.set("floatingOverlap", value ? "overlap" : "never"),
            "editor-table-properties-floating-overlap",
          )}
        </Show>
      </fieldset>
    </div>
  );
}

function RowTabPanel(p: TabPanelProps) {
  const t = useI18n();
  return (
    <div class="oasis-editor-table-properties-panel">
      <div class="oasis-editor-dialog-row">
        {numericInput(
          t("table.rowHeight"),
          () => p.form.rowHeight,
          (v) => p.set("rowHeight", v),
          "editor-table-properties-row-height",
        )}
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("table.rowHeightRule")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={p.form.rowHeightRule}
            onChange={(e) =>
              p.set(
                "rowHeightRule",
                e.currentTarget
                  .value as TablePropertiesDialogInitialValues["rowHeightRule"],
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
          () => p.form.repeatHeader,
          (v) => p.set("repeatHeader", v),
          "editor-table-properties-repeat-header",
        )}
        {checkbox(
          t("table.allowBreakAcrossPages"),
          () => p.form.allowBreakAcrossPages,
          (v) => p.set("allowBreakAcrossPages", v),
          "editor-table-properties-allow-break",
        )}
        {checkbox(
          t("table.hiddenRow"),
          () => p.form.hiddenRow,
          (v) => p.set("hiddenRow", v),
          "editor-table-properties-hidden-row",
        )}
      </div>
    </div>
  );
}

function ColumnTabPanel(p: TabPanelProps) {
  const t = useI18n();
  return (
    <div class="oasis-editor-table-properties-panel">
      <div class="oasis-editor-dialog-row">
        {numericInput(
          t("table.columnWidth"),
          () => p.form.columnWidth,
          (v) => p.set("columnWidth", v),
          "editor-table-properties-column-width",
        )}
      </div>
    </div>
  );
}

function CellTabPanel(p: TabPanelProps) {
  const t = useI18n();
  const borderPreview = createMemo(() => {
    const border = resolveBorder(
      p.form.borderStyle,
      p.form.borderWidth,
      p.form.borderColor,
    );
    const css = border
      ? `${border.width}pt ${border.type} ${border.color}`
      : undefined;
    return {
      "background-color": p.form.shading.trim() || undefined,
      "border-top": css && p.form.borderTop ? css : "1px solid #dadce0",
      "border-right": css && p.form.borderRight ? css : "1px solid #dadce0",
      "border-bottom": css && p.form.borderBottom ? css : "1px solid #dadce0",
      "border-left": css && p.form.borderLeft ? css : "1px solid #dadce0",
    };
  });

  return (
    <div class="oasis-editor-table-properties-panel">
      <div class="oasis-editor-dialog-row">
        {numericInput(
          t("table.cellWidth"),
          () => p.form.cellWidth,
          (v) => p.set("cellWidth", v),
          "editor-table-properties-cell-width",
        )}
        <div class="oasis-editor-dialog-input-group oasis-editor-dialog-input-group-grow">
          <label class="oasis-editor-dialog-label">
            {t("table.verticalAlignment")}
          </label>
          <select
            class="oasis-editor-dialog-input"
            value={p.form.cellVerticalAlign}
            onChange={(e) =>
              p.set(
                "cellVerticalAlign",
                e.currentTarget
                  .value as TablePropertiesDialogInitialValues["cellVerticalAlign"],
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
            value={p.form.cellTextDirection}
            onChange={(e) =>
              p.set(
                "cellTextDirection",
                e.currentTarget
                  .value as TablePropertiesDialogInitialValues["cellTextDirection"],
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
            () => p.form.cellNoWrap,
            (v) => p.set("cellNoWrap", v),
            "editor-table-properties-cell-nowrap",
          )}
          {checkbox(
            t("table.fitText"),
            () => p.form.cellFitText,
            (v) => p.set("cellFitText", v),
            "editor-table-properties-cell-fit-text",
          )}
          {checkbox(
            t("table.hideMark"),
            () => p.form.cellHideMark,
            (v) => p.set("cellHideMark", v),
            "editor-table-properties-cell-hide-mark",
          )}
        </div>
      </fieldset>
      <fieldset class="oasis-editor-font-dialog-fieldset">
        <legend>{t("table.cellMargins")}</legend>
        <div class="oasis-editor-dialog-row">
          {numericInput(
            t("paragraph.borderSideTop"),
            () => p.form.marginTop,
            (v) => p.set("marginTop", v),
            "editor-table-properties-margin-top",
          )}
          {numericInput(
            t("paragraph.borderSideRight"),
            () => p.form.marginRight,
            (v) => p.set("marginRight", v),
            "editor-table-properties-margin-right",
          )}
          {numericInput(
            t("paragraph.borderSideBottom"),
            () => p.form.marginBottom,
            (v) => p.set("marginBottom", v),
            "editor-table-properties-margin-bottom",
          )}
          {numericInput(
            t("paragraph.borderSideLeft"),
            () => p.form.marginLeft,
            (v) => p.set("marginLeft", v),
            "editor-table-properties-margin-left",
          )}
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
              value={p.form.borderStyle}
              onChange={(e) => {
                const next = e.currentTarget.value as BorderStyleValue;
                p.set("borderStyle", next);
                if (next === "none") {
                  p.set("borderTop", false);
                  p.set("borderRight", false);
                  p.set("borderBottom", false);
                  p.set("borderLeft", false);
                  p.set("borderStart", false);
                  p.set("borderEnd", false);
                  p.set("borderTlBr", false);
                  p.set("borderTrBl", false);
                } else if (
                  !p.form.borderTop &&
                  !p.form.borderRight &&
                  !p.form.borderBottom &&
                  !p.form.borderLeft
                ) {
                  p.set("borderTop", true);
                  p.set("borderRight", true);
                  p.set("borderBottom", true);
                  p.set("borderLeft", true);
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
            () => p.form.borderWidth,
            (v) => p.set("borderWidth", v),
            "editor-table-properties-border-width",
            p.form.borderStyle === "none",
          )}
          <div class="oasis-editor-dialog-input-group">
            <label class="oasis-editor-dialog-label">
              {t("paragraph.borderColorLabel")}
            </label>
            <input
              type="color"
              class="oasis-editor-dialog-input"
              value={p.form.borderColor || DEFAULT_BORDER_COLOR}
              disabled={p.form.borderStyle === "none"}
              onInput={(e) => p.set("borderColor", e.currentTarget.value)}
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
              value={p.form.shading || "#ffffff"}
              onInput={(e) => p.set("shading", e.currentTarget.value)}
              data-testid="editor-table-properties-shading"
            />
          </div>
        </div>
        <div class="oasis-editor-dialog-style-row">
          {checkbox(
            t("paragraph.borderSideTop"),
            () => p.form.borderTop,
            (v) => p.set("borderTop", v),
            "editor-table-properties-border-top",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("paragraph.borderSideRight"),
            () => p.form.borderRight,
            (v) => p.set("borderRight", v),
            "editor-table-properties-border-right",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("paragraph.borderSideBottom"),
            () => p.form.borderBottom,
            (v) => p.set("borderBottom", v),
            "editor-table-properties-border-bottom",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("paragraph.borderSideLeft"),
            () => p.form.borderLeft,
            (v) => p.set("borderLeft", v),
            "editor-table-properties-border-left",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("table.borderStart"),
            () => p.form.borderStart,
            (v) => p.set("borderStart", v),
            "editor-table-properties-border-start",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("table.borderEnd"),
            () => p.form.borderEnd,
            (v) => p.set("borderEnd", v),
            "editor-table-properties-border-end",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("table.borderTlBr"),
            () => p.form.borderTlBr,
            (v) => p.set("borderTlBr", v),
            "editor-table-properties-border-tlbr",
            p.form.borderStyle === "none",
          )}
          {checkbox(
            t("table.borderTrBl"),
            () => p.form.borderTrBl,
            (v) => p.set("borderTrBl", v),
            "editor-table-properties-border-trbl",
            p.form.borderStyle === "none",
          )}
        </div>
        <div
          class="oasis-editor-table-properties-cell-preview"
          style={borderPreview()}
          data-testid="editor-table-properties-cell-preview"
        />
      </fieldset>
    </div>
  );
}

function AltTextTabPanel(p: TabPanelProps) {
  const t = useI18n();
  return (
    <div class="oasis-editor-table-properties-panel">
      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">{t("table.altTitle")}</label>
        <input
          class="oasis-editor-dialog-input"
          value={p.form.altTitle}
          onInput={(e) => p.set("altTitle", e.currentTarget.value)}
          data-testid="editor-table-properties-alt-title"
        />
      </div>
      <div class="oasis-editor-dialog-input-group">
        <label class="oasis-editor-dialog-label">
          {t("table.altDescription")}
        </label>
        <textarea
          class="oasis-editor-dialog-input oasis-editor-table-properties-textarea"
          value={p.form.altDescription}
          onInput={(e) => p.set("altDescription", e.currentTarget.value)}
          data-testid="editor-table-properties-alt-description"
        />
      </div>
    </div>
  );
}

export function TablePropertiesDialog(props: TablePropertiesDialogProps) {
  const t = useI18n();
  const [form, setForm] = createStore<TableFormState>({
    activeTab: "table",
    tableWidth: "",
    tableWidthUnit: "points",
    tableAlign: "",
    tableIndentLeft: "",
    tableWrapping: "none",
    floatingHorizontalAnchor: "margin",
    floatingVerticalAnchor: "text",
    floatingX: "",
    floatingY: "",
    floatingXAlign: "",
    floatingYAlign: "",
    floatingDistanceTop: "",
    floatingDistanceRight: "",
    floatingDistanceBottom: "",
    floatingDistanceLeft: "",
    floatingOverlap: "overlap",
    rowHeight: "",
    rowHeightRule: "",
    repeatHeader: false,
    allowBreakAcrossPages: true,
    hiddenRow: false,
    columnWidth: "",
    cellWidth: "",
    cellVerticalAlign: "",
    cellTextDirection: "",
    cellNoWrap: false,
    cellFitText: false,
    cellHideMark: false,
    marginTop: "",
    marginRight: "",
    marginBottom: "",
    marginLeft: "",
    borderStyle: "none",
    borderWidth: "",
    borderColor: "",
    borderTop: false,
    borderRight: false,
    borderBottom: false,
    borderLeft: false,
    borderStart: false,
    borderEnd: false,
    borderTlBr: false,
    borderTrBl: false,
    shading: "",
    altTitle: "",
    altDescription: "",
  });

  createEffect(() => {
    if (!props.isOpen) return;
    setForm(
      reconcile({
        activeTab: props.initial.activeTab ?? "table",
        tableWidth: props.initial.tableWidth,
        tableWidthUnit: props.initial.tableWidthUnit,
        tableAlign: props.initial.tableAlign,
        tableIndentLeft: props.initial.tableIndentLeft,
        tableWrapping: props.initial.tableWrapping,
        floatingHorizontalAnchor: props.initial.floatingHorizontalAnchor,
        floatingVerticalAnchor: props.initial.floatingVerticalAnchor,
        floatingX: props.initial.floatingX,
        floatingY: props.initial.floatingY,
        floatingXAlign: props.initial.floatingXAlign,
        floatingYAlign: props.initial.floatingYAlign,
        floatingDistanceTop: props.initial.floatingDistanceTop,
        floatingDistanceRight: props.initial.floatingDistanceRight,
        floatingDistanceBottom: props.initial.floatingDistanceBottom,
        floatingDistanceLeft: props.initial.floatingDistanceLeft,
        floatingOverlap: props.initial.floatingOverlap,
        rowHeight: props.initial.rowHeight,
        rowHeightRule: props.initial.rowHeightRule,
        repeatHeader: props.initial.repeatHeader,
        allowBreakAcrossPages: props.initial.allowBreakAcrossPages,
        hiddenRow: props.initial.hiddenRow,
        columnWidth: props.initial.columnWidth,
        cellWidth: props.initial.cellWidth,
        cellVerticalAlign: props.initial.cellVerticalAlign,
        cellTextDirection: props.initial.cellTextDirection,
        cellNoWrap: props.initial.cellNoWrap,
        cellFitText: props.initial.cellFitText,
        cellHideMark: props.initial.cellHideMark,
        marginTop: props.initial.marginTop,
        marginRight: props.initial.marginRight,
        marginBottom: props.initial.marginBottom,
        marginLeft: props.initial.marginLeft,
        borderStyle: props.initial.borderStyle,
        borderWidth: props.initial.borderWidth,
        borderColor: props.initial.borderColor,
        borderTop: props.initial.borderTop,
        borderRight: props.initial.borderRight,
        borderBottom: props.initial.borderBottom,
        borderLeft: props.initial.borderLeft,
        borderStart: props.initial.borderStart,
        borderEnd: props.initial.borderEnd,
        borderTlBr: props.initial.borderTopLeftToBottomRight,
        borderTrBl: props.initial.borderTopRightToBottomLeft,
        shading: props.initial.shading,
        altTitle: props.initial.altTitle,
        altDescription: props.initial.altDescription,
      }),
    );
  });

  const handleApply = () => {
    const border = resolveBorder(
      form.borderStyle,
      form.borderWidth,
      form.borderColor,
    );
    props.onApply(
      {
        tableWidth: parseWidth(form.tableWidth, form.tableWidthUnit),
        tableAlign: form.tableAlign || null,
        tableIndentLeft: parseWidth(form.tableIndentLeft, "points"),
        tableFloating:
          form.tableWrapping === "around"
            ? {
                horizontalAnchor: form.floatingHorizontalAnchor,
                verticalAnchor: form.floatingVerticalAnchor,
                ...(form.floatingXAlign
                  ? {
                      xAlign: form.floatingXAlign as NonNullable<
                        EditorTableFloatingLayout["xAlign"]
                      >,
                    }
                  : { x: parseNumber(form.floatingX) ?? 0 }),
                ...(form.floatingYAlign
                  ? {
                      yAlign: form.floatingYAlign as NonNullable<
                        EditorTableFloatingLayout["yAlign"]
                      >,
                    }
                  : { y: parseNumber(form.floatingY) ?? 0 }),
                distanceTop: parseNumber(form.floatingDistanceTop) ?? 0,
                distanceRight: parseNumber(form.floatingDistanceRight) ?? 0,
                distanceBottom: parseNumber(form.floatingDistanceBottom) ?? 0,
                distanceLeft: parseNumber(form.floatingDistanceLeft) ?? 0,
              }
            : null,
        tableOverlap:
          form.tableWrapping === "around" ? form.floatingOverlap : null,
        rowHeight: parseWidth(form.rowHeight, "points"),
        rowHeightRule: form.rowHeightRule || null,
        repeatHeader: form.repeatHeader,
        cantSplit: !form.allowBreakAcrossPages,
        hiddenRow: form.hiddenRow,
        columnWidth: parseWidth(form.columnWidth, "points"),
        cellWidth: parseWidth(form.cellWidth, "points"),
        cellVerticalAlign: form.cellVerticalAlign || null,
        cellTextDirection: form.cellTextDirection || null,
        cellNoWrap: form.cellNoWrap,
        cellFitText: form.cellFitText,
        cellHideMark: form.cellHideMark,
        margins: {
          top: parseNumber(form.marginTop),
          right: parseNumber(form.marginRight),
          bottom: parseNumber(form.marginBottom),
          left: parseNumber(form.marginLeft),
        },
        borders: {
          top: form.borderTop ? border : null,
          right: form.borderRight ? border : null,
          bottom: form.borderBottom ? border : null,
          left: form.borderLeft ? border : null,
          start: form.borderStart ? border : null,
          end: form.borderEnd ? border : null,
          topLeftToBottomRight: form.borderTlBr ? border : null,
          topRightToBottomLeft: form.borderTrBl ? border : null,
        },
        shading: form.shading.trim() || null,
        altTitle: form.altTitle.trim() || null,
        altDescription: form.altDescription.trim() || null,
      },
      props.initial,
    );
    props.onClose();
  };

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t("table.propertiesTitle")}
      onClose={props.onClose}
      size="lg"
      class="oasis-editor-table-properties-dialog"
      bodyClass="oasis-editor-table-properties-body"
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={handleApply}
          cancelLabel={t("generic.cancel")}
          confirmLabel={t("generic.ok")}
          cancelTestId="editor-table-properties-cancel"
          confirmTestId="editor-table-properties-apply"
        />
      }
    >
      <Tabs
        value={form.activeTab}
        onChange={(tab) => setForm("activeTab", tab)}
        ariaLabel={t("table.propertiesTitle")}
        class="oasis-editor-table-properties-tabs"
        items={[
          {
            id: "table",
            label: t("table.tabTable"),
            testId: "editor-table-properties-tab-table",
            panel: <TableTabPanel form={form} set={setForm} />,
          },
          {
            id: "row",
            label: t("table.tabRow"),
            testId: "editor-table-properties-tab-row",
            panel: <RowTabPanel form={form} set={setForm} />,
          },
          {
            id: "column",
            label: t("table.tabColumn"),
            testId: "editor-table-properties-tab-column",
            panel: <ColumnTabPanel form={form} set={setForm} />,
          },
          {
            id: "cell",
            label: t("table.tabCell"),
            testId: "editor-table-properties-tab-cell",
            panel: <CellTabPanel form={form} set={setForm} />,
          },
          {
            id: "altText",
            label: t("table.tabAltText"),
            testId: "editor-table-properties-tab-alt-text",
            panel: <AltTextTabPanel form={form} set={setForm} />,
          },
        ]}
      />
    </Dialog>
  );
}
