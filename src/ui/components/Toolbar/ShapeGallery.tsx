import { For, Show, createSignal, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { Locale } from "@/i18n/index.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";
import { SHAPE_CATEGORIES, shapeLabel } from "./shapeCatalog.js";
import { ShapeThumbnail } from "./shapePreview.js";
import { getRecentShapes, pushRecentShape } from "./recentShapes.js";

/**
 * Word-style "Formas" gallery: recently-used shapes followed by categorized
 * grids of outline thumbnails. Each tile dispatches the existing `insertShape`
 * command; the enclosing {@link Menu} auto-closes on the button click.
 */
export function ShapeGallery(props: { api: ToolbarActionApi }): JSX.Element {
  const t = useI18n();
  // `locale.id` is a tiny self-describing key (value === the locale code), used
  // to localize shape tooltips that live outside the typed translation union.
  const locale = (): Locale => (t("locale.id") === "en" ? "en" : "pt-BR");
  const [recent, setRecent] = createSignal<string[]>(getRecentShapes());

  const insert = (preset: string): void => {
    setRecent(pushRecentShape(preset));
    props.api.commands.execute("insertShape", preset);
    props.api.focusEditor();
  };

  const Tile = (tileProps: { preset: string }): JSX.Element => (
    <button
      type="button"
      class="oasis-editor-shape-gallery-tile"
      title={shapeLabel(tileProps.preset, locale())}
      aria-label={shapeLabel(tileProps.preset, locale())}
      data-testid={`editor-toolbar-shape-${tileProps.preset}`}
      onClick={(): void => insert(tileProps.preset)}
    >
      <ShapeThumbnail preset={tileProps.preset} />
    </button>
  );

  return (
    <div class="oasis-editor-shape-gallery">
      <Show when={recent().length > 0}>
        <div class="oasis-editor-shape-gallery-section-header">
          {t("toolbar.shapes.recentlyUsed")}
        </div>
        <div class="oasis-editor-shape-gallery-grid">
          <For each={recent()}>
            {(preset): JSX.Element => <Tile preset={preset} />}
          </For>
        </div>
      </Show>
      <For each={SHAPE_CATEGORIES}>
        {(category): JSX.Element => (
          <>
            <div class="oasis-editor-shape-gallery-section-header">
              {t(category.headerKey)}
            </div>
            <div class="oasis-editor-shape-gallery-grid">
              <For each={category.presets}>
                {(preset): JSX.Element => <Tile preset={preset} />}
              </For>
            </div>
          </>
        )}
      </For>
    </div>
  );
}
