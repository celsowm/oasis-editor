import { For, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { TranslationKey } from "@/i18n/index.js";
import { NumberField } from "@/ui/public/NumberField.js";
import { Button } from "@/ui/components/Toolbar/primitives/Button.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

/** Reads a centimetre command value, formatted to two decimals (blank if none). */
function cmValue(api: ToolbarActionApi, command: string): string {
  const value = api.commands.state(command).value;
  return typeof value === "number" ? value.toFixed(2) : "";
}

/**
 * A labelled centimetre field for the image Size group (height or width). Reads
 * the current size from the `imageHeightCm`/`imageWidthCm` command and writes it
 * back on change; the core keeps the aspect ratio locked.
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
      <NumberField
        class="oasis-editor-tool-metric oasis-editor-image-size-metric"
        labelClass="oasis-editor-tool-metric-label"
        title={t(labelKey)}
        label={t(labelKey)}
        controlClass="oasis-editor-tool-number"
        data-testid={`editor-toolbar-image-${props.dimension}`}
        min="0.1"
        step="0.1"
        value={cmValue(props.api, command)}
        onChange={(value): void => {
          props.api.commands.execute(
            command,
            value == null ? "" : String(value),
          );
        }}
      />
    </div>
  );
}

/** Aspect-ratio crop presets shown in the Cortar split-button menu. */
const CROP_ASPECT_PRESETS: Array<{ id: string; labelKey: TranslationKey }> = [
  { id: "reset", labelKey: "image.cropReset" },
  { id: "1:1", labelKey: "image.cropRatio.square" },
  { id: "16:9", labelKey: "image.cropRatio.16x9" },
  { id: "4:3", labelKey: "image.cropRatio.4x3" },
  { id: "3:2", labelKey: "image.cropRatio.3x2" },
  { id: "2:3", labelKey: "image.cropRatio.2x3" },
  { id: "3:4", labelKey: "image.cropRatio.3x4" },
  { id: "9:16", labelKey: "image.cropRatio.9x16" },
];

/** The Cortar chevron menu: toggle crop mode + aspect-ratio presets. */
export function ImageCropMenu(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  return (
    <div class="oasis-editor-toolbar-panel oasis-editor-image-crop-menu">
      <Button
        icon="crop"
        active={props.api.commands.state("imageCrop").isActive}
        data-testid="editor-toolbar-image-crop-toggle"
        onClick={(): void => {
          props.api.commands.execute("imageCrop");
        }}
        label={t("image.crop")}
        tooltip={t("image.crop")}
      />
      <div class="oasis-editor-toolbar-panel-separator" role="separator" />
      <div class="oasis-editor-image-crop-ratios">
        <For each={CROP_ASPECT_PRESETS}>
          {(preset): JSX.Element => (
            <Button
              class="oasis-editor-image-crop-ratio"
              label={t(preset.labelKey)}
              data-testid={`editor-toolbar-image-crop-${preset.id}`}
              onClick={(): void => {
                props.api.commands.execute("imageCropAspect", preset.id);
              }}
            />
          )}
        </For>
      </div>
    </div>
  );
}
