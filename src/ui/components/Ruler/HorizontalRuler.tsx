import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  type Accessor,
} from "solid-js";
import {
  getActiveSectionIndex,
  getDocumentPageSettings,
  normalizePageSettings,
  type EditorPageSettings,
  type EditorState,
} from "@/core/model.js";
import { getToolbarStyleState } from "@/ui/toolbarStyleState.js";
import { useI18n } from "@/i18n/I18nContext.js";
import type { ToolbarHost } from "@/ui/components/Toolbar/state/createToolbarApi.js";

import { EDITOR_SCROLL_PADDING_PX } from "@/ui/editorLayoutConstants.js";
import {
  clamp,
  computeRulerGeometry,
  computeRulerTicks,
  measurePageLeft,
  MIN_CONTENT_WIDTH_PX,
  resolveFirstLineOffset,
  type RulerGeometry,
  type RulerIndents,
} from "./rulerGeometry.js";
import type { RulerTick } from "@/ui/components/Ruler/rulerGeometry.js";
import { JSX } from "solid-js";

export interface HorizontalRulerProps {
  state: Accessor<EditorState>;
  toolbarHost: () => ToolbarHost;
  viewportRef: Accessor<HTMLDivElement | undefined>;
  readOnly: Accessor<boolean>;
  /**
   * Visual zoom factor `z`. The ruler lives *outside* the scaled document
   * layer, so model-derived positions/sizes are rendered in screen px (× z) and
   * pointer coordinates are mapped back to document px (÷ z). `pageLeft` is
   * already measured in screen px from the scaled paper, so it is not scaled.
   */
  zoomFactor: Accessor<number>;
}

type DragType =
  | "firstLine"
  | "leftIndent"
  | "hanging"
  | "rightIndent"
  | "leftMargin"
  | "rightMargin";

interface DragState {
  type: DragType;
  /** Current page-relative X of the dragged handle, px. */
  previewX: number;
}

function getActivePageSettings(state: EditorState): EditorPageSettings {
  const idx = getActiveSectionIndex(state);
  const section = state.document.sections?.[idx];
  if (section?.pageSettings) {
    return normalizePageSettings(section.pageSettings);
  }
  return getDocumentPageSettings(state.document);
}

function numFromStyle(value: string | undefined): number {
  if (!value) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function HorizontalRuler(props: HorizontalRulerProps): JSX.Element {
  const t = useI18n();
  let pageRef: HTMLDivElement | undefined;
  const [scrollLeft, setScrollLeft] = createSignal(0);
  // Left offset of the page (paper) inside the scrollable content, measured
  // directly from the DOM. The scroll content's horizontal padding differs
  // between UI variants (34px classic, 0 docs) and the paper may be centered,
  // so we cannot assume a fixed EDITOR_SCROLL_PADDING_PX here. The default is
  // the classic padding, used only until the first measurement lands.
  const [pageLeft, setPageLeft] = createSignal(EDITOR_SCROLL_PADDING_PX);
  const [drag, setDrag] = createSignal<DragState | null>(null);

  const pageSettings = createMemo(
    (): EditorPageSettings => getActivePageSettings(props.state()),
  );

  // Keep the ruler horizontally in sync with the document viewport, and track
  // where the page actually sits so the ruler origin lines up with the caret.
  createEffect((): void => {
    const viewport = props.viewportRef();
    if (!viewport) return;
    // Re-measure whenever the page width changes (re-runs this effect).
    pageSettings().width;
    const sync = (): void => {
      setScrollLeft(viewport.scrollLeft);
      const left = measurePageLeft(viewport);
      if (left !== null) setPageLeft(left);
    };
    sync();
    // The paper paints after this effect runs on first mount; measure once more
    // after layout so the initial position is correct.
    const raf = requestAnimationFrame(sync);
    viewport.addEventListener("scroll", sync, { passive: true });
    const observer = new ResizeObserver(sync);
    observer.observe(viewport);
    onCleanup((): void => {
      cancelAnimationFrame(raf);
      viewport.removeEventListener("scroll", sync);
      observer.disconnect();
    });
  });

  const indents = createMemo<RulerIndents>(
    (): {
      indentLeft: number;
      indentRight: number;
      indentFirstLine: number;
      indentHanging: number;
    } => {
      const style = getToolbarStyleState(props.state());
      return {
        indentLeft: numFromStyle(style.indentLeft),
        indentRight: numFromStyle(style.indentRight),
        indentFirstLine: numFromStyle(style.indentFirstLine),
        indentHanging: numFromStyle(style.indentHanging),
      };
    },
  );

  const baseGeometry = createMemo(
    (): RulerGeometry => computeRulerGeometry(pageSettings(), indents()),
  );

  // Geometry actually drawn, applying the live drag preview without committing.
  const geometry = createMemo<RulerGeometry>((): RulerGeometry => {
    const base = baseGeometry();
    const d = drag();
    if (!d) return base;
    const offset = resolveFirstLineOffset(indents());
    switch (d.type) {
      case "leftMargin":
        return {
          ...base,
          contentLeft: d.previewX,
          leftIndentX: d.previewX + indents().indentLeft,
          firstLineX: d.previewX + indents().indentLeft + offset,
        };
      case "rightMargin":
        return {
          ...base,
          contentRight: d.previewX,
          rightIndentX: d.previewX - indents().indentRight,
        };
      case "leftIndent":
        return {
          ...base,
          leftIndentX: d.previewX,
          firstLineX: d.previewX + offset,
        };
      case "firstLine":
        return { ...base, firstLineX: d.previewX };
      case "hanging":
        // Hanging marker moves the body indent while the first line stays put.
        return { ...base, leftIndentX: d.previewX };
      case "rightIndent":
        return { ...base, rightIndentX: d.previewX };
      default:
        return base;
    }
  });

  const unit = (): "in" | "cm" =>
    typeof navigator !== "undefined" &&
    navigator.language?.toLowerCase().startsWith("en")
      ? "in"
      : "cm";

  const ticks = createMemo((): RulerTick[] =>
    computeRulerTicks(pageSettings().width, baseGeometry().contentLeft, unit()),
  );

  // Scale a document-px value into the screen-px space the ruler renders in.
  const z = (): number => props.zoomFactor();
  const sx = (value: number): number => value * z();

  const trackWidth = createMemo(
    (): number => pageLeft() * 2 + sx(pageSettings().width),
  );

  const pageXFromClient = (clientX: number): number => {
    const rect = pageRef?.getBoundingClientRect();
    if (!rect) return 0;
    // rect is the scaled page element; map the screen offset back to document px.
    return clamp((clientX - rect.left) / z(), 0, pageSettings().width);
  };

  const beginDrag = (type: DragType, event: PointerEvent): void => {
    if (props.readOnly()) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget as HTMLElement;
    target.setPointerCapture?.(event.pointerId);
    setDrag({ type, previewX: pageXFromClient(event.clientX) });

    const onMove = (moveEvent: PointerEvent): void => {
      setDrag((current): { previewX: number; type: DragType } | null =>
        current
          ? { ...current, previewX: pageXFromClient(moveEvent.clientX) }
          : current,
      );
    };
    const onUp = (): void => {
      target.releasePointerCapture?.(event.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
      commitDrag();
      setDrag(null);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const commitDrag = (): void => {
    const d = drag();
    if (!d) return;
    const settings = pageSettings();
    const ind = indents();
    const base = baseGeometry();
    const commands = props.toolbarHost().commands;
    const contentWidth = base.contentRight - base.contentLeft;

    switch (d.type) {
      case "leftMargin": {
        const maxLeft =
          settings.width -
          settings.margins.right -
          base.gutter -
          MIN_CONTENT_WIDTH_PX;
        const newLeft = clamp(
          d.previewX - base.gutter,
          0,
          Math.max(0, maxLeft),
        );
        commands.execute("setPageMargins", { left: newLeft });
        break;
      }
      case "rightMargin": {
        const maxRight =
          settings.width - base.contentLeft - MIN_CONTENT_WIDTH_PX;
        const newRight = clamp(
          settings.width - d.previewX,
          0,
          Math.max(0, maxRight),
        );
        commands.execute("setPageMargins", { right: newRight });
        break;
      }
      case "leftIndent": {
        const maxIndent = contentWidth - ind.indentRight - MIN_CONTENT_WIDTH_PX;
        const newIndentLeft = clamp(
          d.previewX - base.contentLeft,
          0,
          Math.max(0, maxIndent),
        );
        commands.execute("setIndentLeft", newIndentLeft);
        break;
      }
      case "firstLine": {
        const newOffset = d.previewX - base.leftIndentX;
        if (newOffset >= 0) {
          commands.execute("setIndentHanging", 0);
          commands.execute("setIndentFirstLine", newOffset);
        } else {
          commands.execute("setIndentFirstLine", 0);
          commands.execute("setIndentHanging", -newOffset);
        }
        break;
      }
      case "hanging": {
        const maxIndent = contentWidth - ind.indentRight - MIN_CONTENT_WIDTH_PX;
        const newIndentLeft = clamp(
          d.previewX - base.contentLeft,
          0,
          Math.max(0, maxIndent),
        );
        // Keep the first line at its current absolute position.
        const newOffset = base.firstLineX - (base.contentLeft + newIndentLeft);
        commands.execute("setIndentLeft", newIndentLeft);
        if (newOffset >= 0) {
          commands.execute("setIndentHanging", 0);
          commands.execute("setIndentFirstLine", newOffset);
        } else {
          commands.execute("setIndentFirstLine", 0);
          commands.execute("setIndentHanging", -newOffset);
        }
        break;
      }
      case "rightIndent": {
        const maxIndent = contentWidth - ind.indentLeft - MIN_CONTENT_WIDTH_PX;
        const newIndentRight = clamp(
          base.contentRight - d.previewX,
          0,
          Math.max(0, maxIndent),
        );
        commands.execute("setIndentRight", newIndentRight);
        break;
      }
    }
  };

  return (
    <div
      class="oasis-editor-horizontal-ruler"
      data-testid="editor-horizontal-ruler"
      role="presentation"
      aria-label={t("ruler.horizontal")}
    >
      <div
        class="oasis-editor-horizontal-ruler-track"
        style={{
          width: `${trackWidth()}px`,
          transform: `translateX(${-scrollLeft()}px)`,
        }}
      >
        <div
          ref={pageRef}
          class="oasis-editor-horizontal-ruler-page"
          style={{
            left: `${pageLeft()}px`,
            width: `${sx(pageSettings().width)}px`,
          }}
        >
          {/* Margin (gray) zones */}
          <div
            class="oasis-editor-horizontal-ruler-margin"
            style={{ left: "0px", width: `${sx(geometry().contentLeft)}px` }}
          />
          <div
            class="oasis-editor-horizontal-ruler-margin"
            style={{
              left: `${sx(geometry().contentRight)}px`,
              width: `${sx(Math.max(0, pageSettings().width - geometry().contentRight))}px`,
            }}
          />
          {/* Content (white) zone */}
          <div
            class="oasis-editor-horizontal-ruler-content"
            style={{
              left: `${sx(geometry().contentLeft)}px`,
              width: `${sx(Math.max(0, geometry().contentRight - geometry().contentLeft))}px`,
            }}
          />

          {/* Ticks */}
          <For each={ticks()}>
            {(tick): JSX.Element => (
              <>
                <div
                  class={`oasis-editor-horizontal-ruler-tick oasis-editor-horizontal-ruler-tick-${tick.kind}`}
                  style={{ left: `${sx(tick.x)}px` }}
                />
                {tick.label && (
                  <div
                    class="oasis-editor-horizontal-ruler-label"
                    style={{ left: `${sx(tick.x)}px` }}
                  >
                    {tick.label}
                  </div>
                )}
              </>
            )}
          </For>

          {/* Margin handles */}
          <button
            type="button"
            class="oasis-editor-horizontal-ruler-margin-handle"
            style={{ left: `${sx(geometry().contentLeft)}px` }}
            title={t("ruler.leftMargin")}
            aria-label={t("ruler.leftMargin")}
            onPointerDown={(event): void => beginDrag("leftMargin", event)}
          />
          <button
            type="button"
            class="oasis-editor-horizontal-ruler-margin-handle"
            style={{ left: `${sx(geometry().contentRight)}px` }}
            title={t("ruler.rightMargin")}
            aria-label={t("ruler.rightMargin")}
            onPointerDown={(event): void => beginDrag("rightMargin", event)}
          />

          {/* Indent markers */}
          <button
            type="button"
            class="oasis-editor-ruler-marker oasis-editor-ruler-marker-first-line"
            style={{ left: `${sx(geometry().firstLineX)}px` }}
            title={t("ruler.firstLineIndent")}
            aria-label={t("ruler.firstLineIndent")}
            onPointerDown={(event): void => beginDrag("firstLine", event)}
          />
          <button
            type="button"
            class="oasis-editor-ruler-marker oasis-editor-ruler-marker-hanging"
            style={{ left: `${sx(geometry().leftIndentX)}px` }}
            title={t("ruler.hangingIndent")}
            aria-label={t("ruler.hangingIndent")}
            onPointerDown={(event): void => beginDrag("hanging", event)}
          />
          <button
            type="button"
            class="oasis-editor-ruler-marker oasis-editor-ruler-marker-left-box"
            style={{ left: `${sx(geometry().leftIndentX)}px` }}
            title={t("ruler.leftIndent")}
            aria-label={t("ruler.leftIndent")}
            onPointerDown={(event): void => beginDrag("leftIndent", event)}
          />
          <button
            type="button"
            class="oasis-editor-ruler-marker oasis-editor-ruler-marker-right-indent"
            style={{ left: `${sx(geometry().rightIndentX)}px` }}
            title={t("ruler.rightIndent")}
            aria-label={t("ruler.rightIndent")}
            onPointerDown={(event): void => beginDrag("rightIndent", event)}
          />
        </div>
      </div>
    </div>
  );
}
