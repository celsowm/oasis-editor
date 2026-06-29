import { createEffect, createMemo, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Button } from "@/ui/public/Button.js";
import { Checkbox } from "@/ui/public/Checkbox.js";
import { ColorField } from "@/ui/public/ColorField.js";
import { FieldGroup } from "@/ui/public/FieldGroup.js";
import { FormField } from "@/ui/public/FormField.js";
import { Grid } from "@/ui/public/Grid.js";
import { NumberField } from "@/ui/public/NumberField.js";
import { SelectField } from "@/ui/public/SelectField.js";
import { Stack } from "@/ui/public/Stack.js";
import { Tabs } from "@/ui/components/Tabs/Tabs.js";
import { Dialog } from "./Dialog.js";
import { TabStopsDialog } from "./TabStopsDialog.js";

import type {
  EditorBorderStyle,
  EditorParagraphStyle,
  EditorTabStop,
} from "@/core/model.js";

type SpecialIndent = "none" | "firstLine" | "hanging";
type BorderStyleValue = "none" | "solid" | "dashed" | "dotted";
type LineRuleValue = "auto" | "exact" | "atLeast" | null;
type LineSpacingMode =
  | "single"
  | "onePointFive"
  | "double"
  | "multiple"
  | "atLeast"
  | "exact";

/** Word's pt-based "At" values are stored as px for exact/atLeast line rules. */
const PT_TO_PX = 96 / 72;

export interface ParagraphDialogInitialValues {
  align: string;
  indentLeft: string;
  indentRight: string;
  indentFirstLine: string;
  indentHanging: string;
  mirrorIndents: boolean;
  spacingBefore: string;
  spacingAfter: string;
  lineHeight: string;
  lineRule: string;
  contextualSpacing: boolean;
  outlineLevel: string;
  shading: string;
  borderStyle: string;
  borderWidth: string;
  borderColor: string;
  borderSideTop: boolean;
  borderSideRight: boolean;
  borderSideBottom: boolean;
  borderSideLeft: boolean;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
  keepLinesTogether: boolean;
  widowControl: boolean;
  tabs: EditorTabStop[];
}

export interface ParagraphDialogBorders {
  top: EditorBorderStyle | null;
  right: EditorBorderStyle | null;
  bottom: EditorBorderStyle | null;
  left: EditorBorderStyle | null;
}

export interface ParagraphDialogApplyValues {
  align: EditorParagraphStyle["align"] | null;
  indentLeft: number | null;
  indentRight: number | null;
  indentFirstLine: number | null;
  indentHanging: number | null;
  mirrorIndents: boolean;
  spacingBefore: number | null;
  spacingAfter: number | null;
  lineHeight: number | null;
  lineRule: LineRuleValue;
  contextualSpacing: boolean;
  outlineLevel: number | null;
  shading: string | null;
  /**
   * Per-edge paragraph borders. The dialog edits one shared style/width/color
   * and toggles which edges carry it; each edge is the shared border or `null`.
   */
  borders: ParagraphDialogBorders;
  pageBreakBefore: boolean;
  keepWithNext: boolean;
  keepLinesTogether: boolean;
  widowControl: boolean;
  tabs: EditorTabStop[];
}

const DEFAULT_BORDER_WIDTH_PT = 0.5;
const DEFAULT_BORDER_COLOR = "#000000";
const OUTLINE_BODY = "";

export interface ParagraphDialogProps {
  isOpen: boolean;
  initial: ParagraphDialogInitialValues;
  onClose: () => void;
  onApply: (
    values: ParagraphDialogApplyValues,
    original: ParagraphDialogInitialValues,
  ) => void;
  /** Persist the current values onto the default paragraph style. */
  onSetDefault?: (values: ParagraphDialogApplyValues) => void;
}

function parseNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/** Map the model's `lineRule` + `lineHeight` onto a Word line-spacing mode. */
function deriveLineSpacing(
  lineRule: string,
  lineHeight: number | null,
): { mode: LineSpacingMode; at: number | null } {
  if (lineRule === "exact" || lineRule === "atLeast") {
    const pt = lineHeight !== null ? Math.round(lineHeight / PT_TO_PX) : null;
    return { mode: lineRule, at: pt };
  }
  if (lineHeight === null) return { mode: "multiple", at: null };
  if (lineHeight === 1) return { mode: "single", at: null };
  if (lineHeight === 1.5) return { mode: "onePointFive", at: null };
  if (lineHeight === 2) return { mode: "double", at: null };
  return { mode: "multiple", at: lineHeight };
}

export function ParagraphDialog(props: ParagraphDialogProps): JSX.Element {
  const t = useI18n();
  const [align, setAlign] = createSignal("");
  const [outlineLevel, setOutlineLevel] = createSignal(OUTLINE_BODY);
  const [indentLeft, setIndentLeft] = createSignal<number | null>(null);
  const [indentRight, setIndentRight] = createSignal<number | null>(null);
  const [special, setSpecial] = createSignal<SpecialIndent>("none");
  const [specialBy, setSpecialBy] = createSignal<number | null>(null);
  const [mirrorIndents, setMirrorIndents] = createSignal(false);
  const [spacingBefore, setSpacingBefore] = createSignal<number | null>(null);
  const [spacingAfter, setSpacingAfter] = createSignal<number | null>(null);
  const [lineMode, setLineMode] = createSignal<LineSpacingMode>("multiple");
  const [lineAt, setLineAt] = createSignal<number | null>(null);
  const [contextualSpacing, setContextualSpacing] = createSignal(false);
  const [shading, setShading] = createSignal("");
  const [borderStyle, setBorderStyle] = createSignal<BorderStyleValue>("none");
  const [borderWidth, setBorderWidth] = createSignal<number | null>(null);
  const [borderColor, setBorderColor] = createSignal("");
  const [sideTop, setSideTop] = createSignal(false);
  const [sideRight, setSideRight] = createSignal(false);
  const [sideBottom, setSideBottom] = createSignal(false);
  const [sideLeft, setSideLeft] = createSignal(false);
  const [pageBreakBefore, setPageBreakBefore] = createSignal(false);
  const [keepWithNext, setKeepWithNext] = createSignal(false);
  const [keepLinesTogether, setKeepLinesTogether] = createSignal(false);
  const [widowControl, setWidowControl] = createSignal(true);
  const [tabs, setTabs] = createSignal<EditorTabStop[]>([]);
  const [tabsDialogOpen, setTabsDialogOpen] = createSignal(false);

  createEffect((): void => {
    if (props.isOpen) {
      setAlign(props.initial.align ?? "");
      setOutlineLevel(props.initial.outlineLevel ?? OUTLINE_BODY);
      setIndentLeft(parseNumber(props.initial.indentLeft ?? ""));
      setIndentRight(parseNumber(props.initial.indentRight ?? ""));
      setMirrorIndents(props.initial.mirrorIndents ?? false);
      setSpacingBefore(parseNumber(props.initial.spacingBefore ?? ""));
      setSpacingAfter(parseNumber(props.initial.spacingAfter ?? ""));
      setContextualSpacing(props.initial.contextualSpacing ?? false);
      setShading(props.initial.shading ?? "");

      const { mode, at } = deriveLineSpacing(
        props.initial.lineRule ?? "",
        parseNumber(props.initial.lineHeight ?? ""),
      );
      setLineMode(mode);
      setLineAt(at);

      const initialBorderStyle = props.initial.borderStyle;
      setBorderStyle(
        initialBorderStyle === "solid" ||
          initialBorderStyle === "dashed" ||
          initialBorderStyle === "dotted"
          ? initialBorderStyle
          : "none",
      );
      setBorderWidth(parseNumber(props.initial.borderWidth ?? ""));
      setBorderColor(props.initial.borderColor ?? "");
      setSideTop(props.initial.borderSideTop ?? false);
      setSideRight(props.initial.borderSideRight ?? false);
      setSideBottom(props.initial.borderSideBottom ?? false);
      setSideLeft(props.initial.borderSideLeft ?? false);

      setPageBreakBefore(props.initial.pageBreakBefore ?? false);
      setKeepWithNext(props.initial.keepWithNext ?? false);
      setKeepLinesTogether(props.initial.keepLinesTogether ?? false);
      setWidowControl(props.initial.widowControl ?? true);
      setTabs(props.initial.tabs ?? []);

      const firstLine = parseNumber(props.initial.indentFirstLine ?? "");
      const hanging = parseNumber(props.initial.indentHanging ?? "");
      if (hanging !== null && hanging > 0) {
        setSpecial("hanging");
        setSpecialBy(hanging);
      } else if (firstLine !== null && firstLine > 0) {
        setSpecial("firstLine");
        setSpecialBy(firstLine);
      } else {
        setSpecial("none");
        setSpecialBy(null);
      }
    }
  });

  const atEnabled = (): boolean =>
    lineMode() === "multiple" ||
    lineMode() === "atLeast" ||
    lineMode() === "exact";

  /** Resolve the editor's `lineHeight`/`lineRule` from the UI mode + "At". */
  const resolveLineSpacing = (): {
    lineHeight: number | null;
    lineRule: LineRuleValue;
  } => {
    switch (lineMode()) {
      case "single":
        return { lineHeight: 1, lineRule: null };
      case "onePointFive":
        return { lineHeight: 1.5, lineRule: null };
      case "double":
        return { lineHeight: 2, lineRule: null };
      case "multiple":
        return { lineHeight: lineAt(), lineRule: null };
      case "atLeast":
        return {
          lineHeight: lineAt() !== null ? lineAt()! * PT_TO_PX : null,
          lineRule: "atLeast",
        };
      case "exact":
        return {
          lineHeight: lineAt() !== null ? lineAt()! * PT_TO_PX : null,
          lineRule: "exact",
        };
    }
  };

  const previewStyle = createMemo((): Record<string, string | undefined> => {
    const left = indentLeft();
    const right = indentRight();
    const firstLine = special() === "firstLine" ? specialBy() : null;
    const hanging = special() === "hanging" ? specialBy() : null;
    const textIndent =
      firstLine !== null ? firstLine : hanging !== null ? -hanging : null;
    const borderCss =
      borderStyle() !== "none"
        ? `${borderWidth() ?? DEFAULT_BORDER_WIDTH_PT}pt ${borderStyle()} ${
            borderColor().trim() || DEFAULT_BORDER_COLOR
          }`
        : undefined;
    const { lineHeight, lineRule } = resolveLineSpacing();
    const lineHeightCss =
      lineHeight === null
        ? undefined
        : lineRule === "exact" || lineRule === "atLeast"
          ? `${lineHeight}px`
          : String(lineHeight);
    return {
      "text-align": align() || undefined,
      "line-height": lineHeightCss,
      "padding-left": left !== null ? `${left + (hanging ?? 0)}pt` : undefined,
      "padding-right": right !== null ? `${right}pt` : undefined,
      "text-indent": textIndent !== null ? `${textIndent}pt` : undefined,
      "background-color": shading().trim() || undefined,
      "border-top": borderCss && sideTop() ? borderCss : undefined,
      "border-right": borderCss && sideRight() ? borderCss : undefined,
      "border-bottom": borderCss && sideBottom() ? borderCss : undefined,
      "border-left": borderCss && sideLeft() ? borderCss : undefined,
    } as Record<string, string | undefined>;
  });

  const resolveBorders = (): ParagraphDialogBorders => {
    const style = borderStyle();
    if (style === "none") {
      return { top: null, right: null, bottom: null, left: null };
    }
    const width = borderWidth();
    const border: EditorBorderStyle = {
      type: style,
      width: width !== null && width > 0 ? width : DEFAULT_BORDER_WIDTH_PT,
      color: borderColor().trim() || DEFAULT_BORDER_COLOR,
    };
    return {
      top: sideTop() ? border : null,
      right: sideRight() ? border : null,
      bottom: sideBottom() ? border : null,
      left: sideLeft() ? border : null,
    };
  };

  const collectValues = (): ParagraphDialogApplyValues => {
    const by = specialBy();
    const { lineHeight, lineRule } = resolveLineSpacing();
    const outline = outlineLevel();
    return {
      align: (align() || null) as ParagraphDialogApplyValues["align"],
      indentLeft: indentLeft(),
      indentRight: indentRight(),
      indentFirstLine: special() === "firstLine" ? by : null,
      indentHanging: special() === "hanging" ? by : null,
      mirrorIndents: mirrorIndents(),
      spacingBefore: spacingBefore(),
      spacingAfter: spacingAfter(),
      lineHeight,
      lineRule,
      contextualSpacing: contextualSpacing(),
      outlineLevel: outline === OUTLINE_BODY ? null : Number(outline),
      shading: shading().trim() || null,
      borders: resolveBorders(),
      pageBreakBefore: pageBreakBefore(),
      keepWithNext: keepWithNext(),
      keepLinesTogether: keepLinesTogether(),
      widowControl: widowControl(),
      tabs: tabs(),
    };
  };

  const handleApply = (): void => {
    props.onApply(collectValues(), props.initial);
    props.onClose();
  };

  const handleSetDefault = (): void => {
    props.onSetDefault?.(collectValues());
    props.onClose();
  };

  const alignField = (
    <SelectField
      label={t("paragraph.alignLabel")}
      value={align()}
      onChange={setAlign}
      data-testid="editor-paragraph-dialog-align"
      options={[
        { value: "left", label: t("paragraph.alignLeft") },
        { value: "center", label: t("paragraph.alignCenter") },
        { value: "right", label: t("paragraph.alignRight") },
        { value: "justify", label: t("paragraph.alignJustify") },
      ]}
    />
  );

  const outlineField = (
    <SelectField
      label={t("paragraph.outlineLevelLabel")}
      value={outlineLevel()}
      onChange={setOutlineLevel}
      data-testid="editor-paragraph-dialog-outline-level"
      options={[
        { value: OUTLINE_BODY, label: t("paragraph.outlineBodyText") },
        ...Array.from(
          { length: 9 },
          (_, level): { value: string; label: string } => ({
            value: String(level),
            label: t("paragraph.outlineLevelN", [level + 1]),
          }),
        ),
      ]}
    />
  );

  const indentsAndSpacingPanel = (
    <div class="oasis-editor-paragraph-dialog-panel">
      <FieldGroup
        class="oasis-editor-dialog-fieldset"
        legend={t("paragraph.groupGeneral")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>{alignField}</Grid>
          <Grid size={{ xs: 12, md: 6 }}>{outlineField}</Grid>
        </Grid>
      </FieldGroup>

      <FieldGroup
        class="oasis-editor-dialog-fieldset"
        legend={t("paragraph.groupIndent")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <NumberField
              label={t("paragraph.indentLeftLabel")}
              step="1"
              value={indentLeft() ?? ""}
              onChange={setIndentLeft}
              data-testid="editor-paragraph-dialog-indent-left"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <NumberField
              label={t("paragraph.indentRightLabel")}
              step="1"
              value={indentRight() ?? ""}
              onChange={setIndentRight}
              data-testid="editor-paragraph-dialog-indent-right"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <SelectField
              label={t("paragraph.specialLabel")}
              value={special()}
              onChange={(value): void => {
                const next = value as SpecialIndent;
                setSpecial(next);
                if (next === "none") setSpecialBy(null);
              }}
              data-testid="editor-paragraph-dialog-special"
              options={[
                { value: "none", label: t("paragraph.specialNone") },
                { value: "firstLine", label: t("paragraph.specialFirstLine") },
                { value: "hanging", label: t("paragraph.specialHanging") },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <NumberField
              label={t("paragraph.specialByLabel")}
              min="0"
              step="1"
              disabled={special() === "none"}
              value={specialBy() ?? ""}
              onChange={setSpecialBy}
              data-testid="editor-paragraph-dialog-special-by"
            />
          </Grid>
          <Grid size={12}>
            <Checkbox
              label={t("paragraph.mirrorIndentsLabel")}
              checked={mirrorIndents()}
              onChange={setMirrorIndents}
              data-testid="editor-paragraph-dialog-mirror-indents"
            />
          </Grid>
        </Grid>
      </FieldGroup>

      <FieldGroup
        class="oasis-editor-dialog-fieldset"
        legend={t("paragraph.groupSpacing")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 4 }}>
            <NumberField
              label={t("paragraph.spacingBeforeLabel")}
              min="0"
              step="1"
              value={spacingBefore() ?? ""}
              onChange={setSpacingBefore}
              data-testid="editor-paragraph-dialog-spacing-before"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <NumberField
              label={t("paragraph.spacingAfterLabel")}
              min="0"
              step="1"
              value={spacingAfter() ?? ""}
              onChange={setSpacingAfter}
              data-testid="editor-paragraph-dialog-spacing-after"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }} />
          <Grid size={{ xs: 12, md: 8 }}>
            <SelectField
              label={t("paragraph.lineSpacingLabel")}
              value={lineMode()}
              onChange={(value): void => {
                setLineMode(value as LineSpacingMode);
              }}
              data-testid="editor-paragraph-dialog-line-mode"
              options={[
                { value: "single", label: t("paragraph.lineSpacingSingle") },
                {
                  value: "onePointFive",
                  label: t("paragraph.lineSpacingOnePointFive"),
                },
                { value: "double", label: t("paragraph.lineSpacingDouble") },
                {
                  value: "atLeast",
                  label: t("paragraph.lineSpacingAtLeast"),
                },
                { value: "exact", label: t("paragraph.lineSpacingExact") },
                {
                  value: "multiple",
                  label: t("paragraph.lineSpacingMultiple"),
                },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <NumberField
              label={t("paragraph.lineSpacingAt")}
              min="0"
              step={lineMode() === "multiple" ? "0.05" : "1"}
              disabled={!atEnabled()}
              value={lineAt() ?? ""}
              onChange={setLineAt}
              data-testid="editor-paragraph-dialog-line-at"
            />
          </Grid>
          <Grid size={12}>
            <Checkbox
              label={t("paragraph.contextualSpacingLabel")}
              checked={contextualSpacing()}
              onChange={setContextualSpacing}
              data-testid="editor-paragraph-dialog-contextual-spacing"
            />
          </Grid>
        </Grid>
      </FieldGroup>

      <FieldGroup
        class="oasis-editor-dialog-fieldset"
        legend={t("paragraph.groupBorders")}
      >
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 3 }}>
            <SelectField
              label={t("paragraph.borderStyleLabel")}
              value={borderStyle()}
              onChange={(value): void => {
                const next = value as BorderStyleValue;
                setBorderStyle(next);
                if (next === "none") {
                  setSideTop(false);
                  setSideRight(false);
                  setSideBottom(false);
                  setSideLeft(false);
                } else if (
                  !sideTop() &&
                  !sideRight() &&
                  !sideBottom() &&
                  !sideLeft()
                ) {
                  setSideTop(true);
                  setSideRight(true);
                  setSideBottom(true);
                  setSideLeft(true);
                }
              }}
              data-testid="editor-paragraph-dialog-border-style"
              options={[
                { value: "none", label: t("paragraph.borderNone") },
                { value: "solid", label: t("paragraph.borderSolid") },
                { value: "dashed", label: t("paragraph.borderDashed") },
                { value: "dotted", label: t("paragraph.borderDotted") },
              ]}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <NumberField
              label={t("paragraph.borderWidthLabel")}
              min="0"
              step="0.25"
              disabled={borderStyle() === "none"}
              value={borderWidth() ?? ""}
              onChange={setBorderWidth}
              data-testid="editor-paragraph-dialog-border-width"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ColorField
              label={t("paragraph.borderColorLabel")}
              disabled={borderStyle() === "none"}
              value={borderColor() || DEFAULT_BORDER_COLOR}
              onChange={setBorderColor}
              data-testid="editor-paragraph-dialog-border-color"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 3 }}>
            <ColorField
              label={t("paragraph.shadingLabel")}
              value={shading() || "#ffffff"}
              onChange={setShading}
              data-testid="editor-paragraph-dialog-shading"
            />
          </Grid>
        </Grid>
        <FormField
          class="oasis-editor-dialog-input-group-grow"
          label={t("paragraph.borderSidesLabel")}
        >
          <Stack
            class="oasis-editor-dialog-style-row"
            direction="row"
            spacing={1}
          >
            <Checkbox
              label={t("paragraph.borderSideTop")}
              disabled={borderStyle() === "none"}
              checked={sideTop()}
              onChange={setSideTop}
              data-testid="editor-paragraph-dialog-border-side-top"
            />
            <Checkbox
              label={t("paragraph.borderSideRight")}
              disabled={borderStyle() === "none"}
              checked={sideRight()}
              onChange={setSideRight}
              data-testid="editor-paragraph-dialog-border-side-right"
            />
            <Checkbox
              label={t("paragraph.borderSideBottom")}
              disabled={borderStyle() === "none"}
              checked={sideBottom()}
              onChange={setSideBottom}
              data-testid="editor-paragraph-dialog-border-side-bottom"
            />
            <Checkbox
              label={t("paragraph.borderSideLeft")}
              disabled={borderStyle() === "none"}
              checked={sideLeft()}
              onChange={setSideLeft}
              data-testid="editor-paragraph-dialog-border-side-left"
            />
          </Stack>
        </FormField>
      </FieldGroup>
    </div>
  );

  const lineAndPageBreaksPanel = (
    <div class="oasis-editor-paragraph-dialog-panel">
      <FieldGroup
        class="oasis-editor-dialog-fieldset"
        legend={t("paragraph.groupPagination")}
      >
        <Stack direction="column" spacing={1}>
          <Checkbox
            label={t("paragraph.widowControlLabel")}
            checked={widowControl()}
            onChange={setWidowControl}
            data-testid="editor-paragraph-dialog-widow-control"
          />
          <Checkbox
            label={t("paragraph.keepWithNextLabel")}
            checked={keepWithNext()}
            onChange={setKeepWithNext}
            data-testid="editor-paragraph-dialog-keep-with-next"
          />
          <Checkbox
            label={t("paragraph.keepLinesTogetherLabel")}
            checked={keepLinesTogether()}
            onChange={setKeepLinesTogether}
            data-testid="editor-paragraph-dialog-keep-lines-together"
          />
          <Checkbox
            label={t("paragraph.pageBreakBeforeLabel")}
            checked={pageBreakBefore()}
            onChange={setPageBreakBefore}
            data-testid="editor-paragraph-dialog-page-break-before"
          />
        </Stack>
      </FieldGroup>
    </div>
  );

  return (
    <>
      <Dialog
        isOpen={props.isOpen}
        title={t("paragraph.title")}
        onClose={props.onClose}
        size="lg"
        footer={
          <div class="oasis-editor-dialog-footer-split">
            <div class="oasis-editor-dialog-footer-start">
              <Button
                variant="secondary"
                onClick={(): void => {
                  setTabsDialogOpen(true);
                }}
                data-testid="editor-paragraph-dialog-tabs"
              >
                {t("paragraph.tabsButton")}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSetDefault}
                data-testid="editor-paragraph-dialog-set-default"
              >
                {t("paragraph.setAsDefault")}
              </Button>
            </div>
            <div class="oasis-editor-dialog-footer-end">
              <Button
                variant="secondary"
                onClick={props.onClose}
                data-testid="editor-paragraph-dialog-cancel"
              >
                {t("generic.cancel")}
              </Button>
              <Button
                variant="primary"
                onClick={handleApply}
                data-testid="editor-paragraph-dialog-apply"
              >
                {t("generic.apply")}
              </Button>
            </div>
          </div>
        }
      >
        <Tabs
          ariaLabel={t("paragraph.title")}
          items={[
            {
              id: "indents",
              label: t("paragraph.tabIndentsSpacing"),
              panel: indentsAndSpacingPanel,
              testId: "editor-paragraph-dialog-tab-indents",
            },
            {
              id: "breaks",
              label: t("paragraph.tabLineBreaks"),
              panel: lineAndPageBreaksPanel,
              testId: "editor-paragraph-dialog-tab-breaks",
            },
          ]}
        />

        <FormField label={t("paragraph.preview")}>
          <div
            class="oasis-editor-dialog-preview"
            data-testid="editor-paragraph-dialog-preview"
            style={previewStyle()}
          >
            {t("paragraph.previewText")}
          </div>
        </FormField>
      </Dialog>

      <TabStopsDialog
        isOpen={tabsDialogOpen()}
        initial={tabs()}
        onClose={(): void => {
          setTabsDialogOpen(false);
        }}
        onApply={setTabs}
      />
    </>
  );
}
