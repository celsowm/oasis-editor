import {
  For,
  Show,
  createEffect,
  createSignal,
  createUniqueId,
  onCleanup,
  type JSX,
} from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { TranslationKey } from "@/i18n/index.js";
import { MetricField } from "@/ui/components/Toolbar/primitives/MetricField.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import type { Locale } from "@/i18n/index.js";
import { SHAPE_CATEGORIES, shapeLabel } from "../shapeCatalog.js";
import { ShapeThumbnail } from "../shapePreview.js";

/** Reads a centimetre command value, formatted to two decimals (blank if none). */
function cmValue(api: ToolbarActionApi, command: string): string {
  const value = api.commands.state(command).value;
  return typeof value === "number" ? value.toFixed(2) : "";
}

/**
 * A labelled centimetre field for the image Size group (height or width). Reads
 * the current size from the `imageHeightCm`/`imageWidthCm` command and writes it
 * back on commit; the core keeps the aspect ratio locked. The draft/commit
 * behaviour comes from `MetricField`: committing per keystroke dropped the
 * contextual Picture Format tab after the first digit.
 */
export function ImageSizeField(props: {
  api: ToolbarActionApi;
  dimension: "height" | "width";
}): JSX.Element {
  const t = useI18n();
  const command =
    props.dimension === "height" ? "imageHeightCm" : "imageWidthCm";
  const labelKey: TranslationKey =
    props.dimension === "height" ? "image.height" : "image.width";
  const icon =
    props.dimension === "height" ? "move-vertical" : "move-horizontal";
  return (
    <div class="oasis-editor-image-size-field">
      <div class="oasis-editor-image-size-icon" aria-hidden="true">
        <ToolIcon name={icon} />
      </div>
      <MetricField
        class="oasis-editor-image-size-metric"
        label={t(labelKey)}
        title={t(labelKey)}
        unit="cm"
        testId={`editor-toolbar-image-${props.dimension}`}
        min="0.1"
        step="0.1"
        disabled={!props.api.commands.state(command).isEnabled}
        value={cmValue(props.api, command)}
        onChange={(value): void => {
          const nextValue = value == null ? "" : String(value);
          if (props.dimension === "height") {
            props.api.commands.execute("imageHeightCm", nextValue);
          } else {
            props.api.commands.execute("imageWidthCm", nextValue);
          }
        }}
      />
    </div>
  );
}

/** Aspect-ratio crop presets shown in the Cortar split-button menu. */
const CROP_ASPECT_GROUPS: Array<{
  id: string;
  labelKey: TranslationKey;
  presets: string[];
}> = [
  { id: "square", labelKey: "image.cropRatio.squareGroup", presets: ["1:1"] },
  {
    id: "portrait",
    labelKey: "image.cropRatio.portrait",
    presets: ["2:3", "3:4", "3:5", "4:5"],
  },
  {
    id: "landscape",
    labelKey: "image.cropRatio.landscape",
    presets: ["3:2", "4:3", "5:3", "5:4", "16:9", "16:10"],
  },
];

const OPEN_CROP_SHAPES = new Set([
  "line",
  "lineInv",
  "straightConnector1",
  "bentConnector3",
  "curvedConnector3",
  "arc",
  "leftBracket",
  "rightBracket",
  "leftBrace",
  "rightBrace",
]);

function cropShapePresets(): string[] {
  return SHAPE_CATEGORIES.flatMap((category) => category.presets).filter(
    (preset, index, all): boolean =>
      !OPEN_CROP_SHAPES.has(preset) && all.indexOf(preset) === index,
  );
}

function CropMenuRow(props: {
  testId: string;
  label: string;
  icon?: string;
  onClick: () => void;
  submenu?: boolean;
  open?: boolean;
  submenuId?: string;
  onHover?: () => void;
}): JSX.Element {
  return (
    <Button
      class="oasis-editor-image-crop-menu-row"
      data-testid={props.testId}
      role="menuitem"
      aria-haspopup={props.submenu ? "menu" : undefined}
      aria-expanded={props.submenu ? props.open : undefined}
      aria-controls={props.submenu ? props.submenuId : undefined}
      onClick={props.onClick}
      onMouseEnter={props.onHover}
      onFocus={props.onHover}
      icon={props.icon}
      label={props.label}
      trailingIcon={props.submenu ? "chevron-right" : undefined}
    />
  );
}

/** The Cortar chevron menu: toggle crop mode + aspect-ratio presets. */
export function ImageCropMenu(props: { api: ToolbarActionApi }): JSX.Element {
  type CropCommand =
    | "imageCrop"
    | "imageCropShape"
    | "imageCropAspect"
    | "imageCropFill"
    | "imageCropFit"
    | "imageCropReset";
  const t = useI18n();
  const locale = (): Locale => (t("locale.id") === "en" ? "en" : "pt-BR");
  const menuId = createUniqueId();
  const shapeSubmenuId = `${menuId}-crop-shapes`;
  const ratioSubmenuId = `${menuId}-crop-ratios`;
  const [submenu, setSubmenu] = createSignal<"shape" | "ratio" | null>(null);
  const openSubmenu = (value: "shape" | "ratio"): void => {
    setSubmenu(value);
  };
  createEffect((): void => {
    if (!submenu()) return;
    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setSubmenu(null);
    };
    window.addEventListener("keydown", handleEscape, true);
    onCleanup(() => window.removeEventListener("keydown", handleEscape, true));
  });
  const apply = (command: CropCommand, payload?: string): void => {
    switch (command) {
      case "imageCrop":
        props.api.commands.execute("imageCrop", undefined);
        break;
      case "imageCropShape":
        props.api.commands.execute("imageCropShape", payload ?? "");
        break;
      case "imageCropAspect":
        props.api.commands.execute("imageCropAspect", payload ?? "");
        break;
      case "imageCropFill":
        props.api.commands.execute("imageCropFill", undefined);
        break;
      case "imageCropFit":
        props.api.commands.execute("imageCropFit", undefined);
        break;
      case "imageCropReset":
        props.api.commands.execute("imageCropReset", undefined);
        break;
    }
    setSubmenu(null);
  };
  return (
    <div
      class="oasis-editor-toolbar-panel oasis-editor-image-crop-menu"
      role="menu"
    >
      <CropMenuRow
        testId="editor-toolbar-image-crop-toggle"
        icon="crop"
        label={t("image.crop")}
        onClick={(): void => apply("imageCrop")}
      />
      <div class="oasis-editor-toolbar-panel-separator" role="separator" />
      <div
        class="oasis-editor-image-crop-menu-submenu-row"
        onMouseLeave={(): void => {
          setSubmenu(null);
        }}
      >
        <CropMenuRow
          testId="editor-toolbar-image-crop-shape"
          icon="shapes"
          label={t("image.cropToShape")}
          submenu
          open={submenu() === "shape"}
          submenuId={shapeSubmenuId}
          onHover={(): void => {
            openSubmenu("shape");
          }}
          onClick={(): void => openSubmenu("shape")}
        />
        <Show when={submenu() === "shape"}>
          <div
            id={shapeSubmenuId}
            class="oasis-editor-image-crop-flyout"
            role="menu"
          >
            <For each={cropShapePresets()}>
              {(preset): JSX.Element => (
                <Button
                  class="oasis-editor-image-crop-shape-tile"
                  title={shapeLabel(preset, locale())}
                  aria-label={shapeLabel(preset, locale())}
                  data-testid={`editor-toolbar-image-crop-shape-${preset}`}
                  onClick={(): void => apply("imageCropShape", preset)}
                >
                  <ShapeThumbnail preset={preset} />
                </Button>
              )}
            </For>
          </div>
        </Show>
      </div>
      <div
        class="oasis-editor-image-crop-menu-submenu-row"
        onMouseLeave={(): void => {
          setSubmenu(null);
        }}
      >
        <CropMenuRow
          testId="editor-toolbar-image-crop-ratio"
          icon="ratio"
          label={t("image.cropAspectRatio")}
          submenu
          open={submenu() === "ratio"}
          submenuId={ratioSubmenuId}
          onHover={(): void => {
            openSubmenu("ratio");
          }}
          onClick={(): void => openSubmenu("ratio")}
        />
        <Show when={submenu() === "ratio"}>
          <div
            id={ratioSubmenuId}
            class="oasis-editor-image-crop-flyout oasis-editor-image-crop-ratio-flyout"
            role="menu"
          >
            <For each={CROP_ASPECT_GROUPS}>
              {(group): JSX.Element => (
                <div class="oasis-editor-image-crop-ratio-group">
                  <div class="oasis-editor-image-crop-ratio-heading">
                    {t(group.labelKey)}
                  </div>
                  <For each={group.presets}>
                    {(preset): JSX.Element => (
                      <Button
                        class="oasis-editor-image-crop-option"
                        label={preset}
                        data-testid={`editor-toolbar-image-crop-${preset}`}
                        onClick={(): void => apply("imageCropAspect", preset)}
                      />
                    )}
                  </For>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>
      <CropMenuRow
        testId="editor-toolbar-image-crop-fill"
        icon="maximize"
        label={t("image.cropFill")}
        onClick={(): void => apply("imageCropFill")}
      />
      <CropMenuRow
        testId="editor-toolbar-image-crop-fit"
        icon="minimize"
        label={t("image.cropFit")}
        onClick={(): void => apply("imageCropFit")}
      />
      <CropMenuRow
        testId="editor-toolbar-image-crop-reset"
        icon="rotate-ccw"
        label={t("image.cropReset")}
        onClick={(): void => apply("imageCropReset")}
      />
    </div>
  );
}
