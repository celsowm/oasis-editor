import {
  For,
  Show,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
  type JSX,
} from "solid-js";
import { Portal } from "solid-js/web";
import { useI18n } from "@/i18n/I18nContext.js";
import "./layoutOptions.css";
import type { WrapPreset } from "@/core/commands/floatingLayout.js";
import type { LayoutOptionsOverlay } from "@/ui/editorUiTypes.js";
import { type TranslationKey } from "@/i18n/index.js";

/** Minimal box geometry (surface-relative) used to anchor the popup. */
export interface LayoutOptionsAnchorBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface FloatingLayoutOptionsProps {
  box: Accessor<LayoutOptionsAnchorBox | null>;
  layoutOptions: LayoutOptionsOverlay;
  surfaceRef: () => HTMLElement | undefined;
  readOnly?: boolean;
}

const WRAP_OPTIONS: ReadonlyArray<{
  preset: WrapPreset;
  labelKey: TranslationKey;
}> = [
  { preset: "square", labelKey: "layoutOptions.square" },
  { preset: "tight", labelKey: "layoutOptions.tight" },
  { preset: "through", labelKey: "layoutOptions.through" },
  { preset: "topAndBottom", labelKey: "layoutOptions.topAndBottom" },
  { preset: "behind", labelKey: "layoutOptions.behind" },
  { preset: "front", labelKey: "layoutOptions.front" },
];

/** Lines-around-a-box pictograms approximating Word's layout-option glyphs. */
function WrapIcon(props: { preset: WrapPreset }): JSX.Element {
  const t = useI18n();
  const line = (x: number, y: number, w: number) => (
    <rect x={x} y={y} width={w} height="2" rx="1" fill="#9aa0a6" />
  );
  const box = (
    x: number,
    y: number,
    w: number,
    h: number,
    fill = "#1a73e8",
  ) => <rect x={x} y={y} width={w} height={h} rx="1.5" fill={fill} />;

  return (
    <svg viewBox="0 0 40 32" fill="none" aria-hidden="true">
      <Show when={props.preset === "square"}>
        {line(4, 6, 14)}
        {line(4, 12, 14)}
        {line(4, 18, 14)}
        {line(4, 24, 32)}
        {box(22, 5, 14, 14)}
      </Show>
      <Show when={props.preset === "tight"}>
        {line(4, 6, 12)}
        {line(4, 12, 10)}
        {line(4, 18, 12)}
        {line(4, 24, 32)}
        <polygon points="29,4 37,12 29,20 21,12" fill="#1a73e8" />
      </Show>
      <Show when={props.preset === "through"}>
        {line(4, 6, 32)}
        {line(4, 12, 9)}
        {line(27, 12, 9)}
        {line(4, 18, 32)}
        <polygon points="20,8 26,14 20,20 14,14" fill="#1a73e8" />
      </Show>
      <Show when={props.preset === "topAndBottom"}>
        {line(4, 5, 32)}
        {box(12, 10, 16, 12)}
        {line(4, 26, 32)}
      </Show>
      <Show when={props.preset === "behind"}>
        {box(13, 7, 14, 18, "#aecbfa")}
        {line(4, 9, 32)}
        {line(4, 15, 32)}
        {line(4, 21, 32)}
      </Show>
      <Show when={props.preset === "front"}>
        {line(4, 9, 32)}
        {line(4, 15, 32)}
        {line(4, 21, 32)}
        {box(13, 7, 14, 18)}
      </Show>
    </svg>
  );
}

export function FloatingLayoutOptions(
  props: FloatingLayoutOptionsProps,
): JSX.Element {
  const t = useI18n();
  const [open, setOpen] = createSignal(false);
  const [surfaceRect, setSurfaceRect] = createSignal<DOMRect | null>(null);
  const [tick, setTick] = createSignal(0);

  const refreshSurfaceRect = () => {
    const surface = props.surfaceRef();
    setSurfaceRect(surface ? surface.getBoundingClientRect() : null);
  };

  let frame: number | null = null;
  const scheduleRefresh = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      refreshSurfaceRect();
      setTick((value) => value + 1);
    });
  };

  onMount(() => {
    refreshSurfaceRect();
    window.addEventListener("scroll", scheduleRefresh, true);
    window.addEventListener("resize", scheduleRefresh);
    onCleanup(() => {
      window.removeEventListener("scroll", scheduleRefresh, true);
      window.removeEventListener("resize", scheduleRefresh);
      if (frame !== null) cancelAnimationFrame(frame);
    });
  });

  // Close the popup whenever the selection target changes or disappears.
  createMemo(() => {
    props.layoutOptions.target();
    props.box();
    setOpen(false);
    scheduleRefresh();
  });

  const visible = () =>
    !props.readOnly &&
    props.box() !== null &&
    props.layoutOptions.target() !== null;

  const anchorPos = createMemo(() => {
    tick();
    const box = props.box();
    const rect = surfaceRect();
    if (!box || !rect) {
      return null;
    }
    // Top-right corner of the object, in viewport coordinates.
    return {
      left: rect.left + box.left + box.width + 6,
      top: rect.top + box.top,
    };
  });

  const select = (preset: WrapPreset) => {
    props.layoutOptions.setPreset(preset);
  };

  return (
    <Show when={visible() && anchorPos()}>
      {(pos) => (
        <Portal mount={document.body}>
          <button
            type="button"
            class="oasis-editor-layout-options-anchor"
            data-testid="editor-layout-options-anchor"
            style={{ left: `${pos().left}px`, top: `${pos().top}px` }}
            title={t("layoutOptions.title")}
            aria-label={t("layoutOptions.title")}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen((value) => !value)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect
                x="3"
                y="4"
                width="10"
                height="10"
                rx="1.5"
                fill="#1a73e8"
              />
              <rect x="3" y="17" width="18" height="2" rx="1" fill="#9aa0a6" />
              <rect x="15" y="5" width="6" height="2" rx="1" fill="#9aa0a6" />
              <rect x="15" y="9" width="6" height="2" rx="1" fill="#9aa0a6" />
            </svg>
          </button>

          <Show when={open()}>
            <div
              class="oasis-editor-layout-options-popup"
              data-testid="editor-layout-options-popup"
              style={{
                left: `${pos().left}px`,
                top: `${pos().top + 32}px`,
              }}
              onMouseDown={(event) => event.preventDefault()}
            >
              <div class="oasis-editor-layout-options-popup-header">
                <span class="oasis-editor-layout-options-title">
                  {t("layoutOptions.title")}
                </span>
                <button
                  type="button"
                  class="oasis-editor-layout-options-close"
                  aria-label={t("generic.close")}
                  onClick={() => setOpen(false)}
                >
                  ×
                </button>
              </div>

              <div class="oasis-editor-layout-options-group-label">
                {t("layoutOptions.inLineGroup")}
              </div>
              <div class="oasis-editor-layout-options-grid">
                <button
                  type="button"
                  class="oasis-editor-layout-options-cell"
                  classList={{
                    "oasis-editor-layout-options-cell-active":
                      props.layoutOptions.preset() === "inline",
                  }}
                  data-testid="editor-layout-options-inline"
                  title={t("layoutOptions.inline")}
                  aria-label={t("layoutOptions.inline")}
                  onClick={() => select("inline")}
                >
                  <svg viewBox="0 0 40 32" fill="none" aria-hidden="true">
                    <rect
                      x="4"
                      y="7"
                      width="9"
                      height="2"
                      rx="1"
                      fill="#9aa0a6"
                    />
                    <rect
                      x="15"
                      y="4"
                      width="11"
                      height="11"
                      rx="1.5"
                      fill="#1a73e8"
                    />
                    <rect
                      x="28"
                      y="7"
                      width="8"
                      height="2"
                      rx="1"
                      fill="#9aa0a6"
                    />
                    <rect
                      x="4"
                      y="20"
                      width="32"
                      height="2"
                      rx="1"
                      fill="#9aa0a6"
                    />
                    <rect
                      x="4"
                      y="26"
                      width="32"
                      height="2"
                      rx="1"
                      fill="#9aa0a6"
                    />
                  </svg>
                </button>
              </div>

              <div class="oasis-editor-layout-options-group-label">
                {t("layoutOptions.wrapGroup")}
              </div>
              <div class="oasis-editor-layout-options-grid">
                <For each={WRAP_OPTIONS}>
                  {(option) => (
                    <button
                      type="button"
                      class="oasis-editor-layout-options-cell"
                      classList={{
                        "oasis-editor-layout-options-cell-active":
                          props.layoutOptions.preset() === option.preset,
                      }}
                      data-testid={`editor-layout-options-${option.preset}`}
                      title={
                        option.preset === "behind"
                          ? `${t(option.labelKey)} — ${t("layoutOptions.behindHint")}`
                          : t(option.labelKey)
                      }
                      aria-label={t(option.labelKey)}
                      onClick={() => select(option.preset)}
                    >
                      <WrapIcon preset={option.preset} />
                    </button>
                  )}
                </For>
              </div>

              <div class="oasis-editor-layout-options-radios">
                <label
                  class="oasis-editor-layout-options-radio"
                  aria-disabled={props.layoutOptions.preset() === "inline"}
                >
                  <input
                    type="radio"
                    name="oasis-layout-position"
                    checked={!props.layoutOptions.fixedPosition()}
                    disabled={props.layoutOptions.preset() === "inline"}
                    onChange={() => props.layoutOptions.setFixedPosition(false)}
                  />
                  {t("layoutOptions.moveWithText")}
                </label>
                <label
                  class="oasis-editor-layout-options-radio"
                  aria-disabled={props.layoutOptions.preset() === "inline"}
                >
                  <input
                    type="radio"
                    name="oasis-layout-position"
                    checked={props.layoutOptions.fixedPosition()}
                    disabled={props.layoutOptions.preset() === "inline"}
                    onChange={() => props.layoutOptions.setFixedPosition(true)}
                  />
                  {t("layoutOptions.fixPosition")}
                </label>
              </div>
            </div>
          </Show>
        </Portal>
      )}
    </Show>
  );
}
