import { createSignal, type JSX } from "solid-js";
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
import {
  DEFAULT_BORDER_COLOR,
  OUTLINE_BODY,
  type BorderStyleValue,
  type LineSpacingMode,
  type ParagraphDialogProps,
  type SpecialIndent,
} from "./paragraph-dialog/ParagraphDialogTypes.js";
import { useParagraphDialogController } from "./paragraph-dialog/useParagraphDialogController.js";

export type {
  ParagraphDialogApplyValues,
  ParagraphDialogBorders,
  ParagraphDialogInitialValues,
  ParagraphDialogProps,
} from "./paragraph-dialog/ParagraphDialogTypes.js";

export function ParagraphDialog(props: ParagraphDialogProps): JSX.Element {
  const t = useI18n();
  const [tabsDialogOpen, setTabsDialogOpen] = createSignal(false);
  const {
    align,
    setAlign,
    outlineLevel,
    setOutlineLevel,
    indentLeft,
    setIndentLeft,
    indentRight,
    setIndentRight,
    special,
    setSpecial,
    specialBy,
    setSpecialBy,
    mirrorIndents,
    setMirrorIndents,
    spacingBefore,
    setSpacingBefore,
    spacingAfter,
    setSpacingAfter,
    lineMode,
    setLineMode,
    lineAt,
    setLineAt,
    contextualSpacing,
    setContextualSpacing,
    shading,
    setShading,
    borderStyle,
    setBorderStyle,
    borderWidth,
    setBorderWidth,
    borderColor,
    setBorderColor,
    sideTop,
    setSideTop,
    sideRight,
    setSideRight,
    sideBottom,
    setSideBottom,
    sideLeft,
    setSideLeft,
    pageBreakBefore,
    setPageBreakBefore,
    keepWithNext,
    setKeepWithNext,
    keepLinesTogether,
    setKeepLinesTogether,
    widowControl,
    setWidowControl,
    tabs,
    setTabs,
    atEnabled,
    previewStyle,
    handleApply,
    handleSetDefault,
  } = useParagraphDialogController(props);

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
