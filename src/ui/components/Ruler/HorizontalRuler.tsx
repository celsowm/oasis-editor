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
  getParagraphs,
  findParagraphTablePathLocation,
  resolveEffectiveParagraphStyle,
  type EditorTabStop,
  getDocumentPageSettings,
  normalizePageSettings,
  type EditorPageSettings,
  type EditorState,
} from "@/core/model.js";
import { normalizeSelection } from "@/core/selection.js";
import { TAB_POS_EPS, type ParagraphTabStopsChange } from "@/core/commands/paragraphTabs.js";
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
  rulerPointerToTabPosition,
  tabPositionToPageX,
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

type RulerTabType = Exclude<EditorTabStop["type"], "clear">;
const TAB_TYPES: RulerTabType[] = ["left", "center", "right", "decimal", "bar"];
const TAB_GLYPHS: Record<RulerTabType, string> = {
  left: "M4 2V12H12", center: "M8 2V12M2 12H14",
  right: "M12 2V12H4", decimal: "M8 2V12M2 12H14M12 7H13",
  bar: "M8 2V14",
};
function TabGlyph(props: { type: RulerTabType }): JSX.Element {
  return <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true">
    <path d={TAB_GLYPHS[props.type]} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="square" />
  </svg>;
}
interface TabDrag {
  stop: EditorTabStop;
  position: number;
  remove: boolean;
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
  const [tabType, setTabType] = createSignal<RulerTabType>("left");
  const [tabDrag, setTabDrag] = createSignal<TabDrag | null>(null);
  let rulerRef: HTMLDivElement | undefined;
  let cancelTabGesture: (() => void) | undefined;
  onCleanup(() => cancelTabGesture?.());

  const pageSettings = createMemo((): EditorPageSettings =>
    getActivePageSettings(props.state()),
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

  const baseGeometry = createMemo((): RulerGeometry =>
    computeRulerGeometry(pageSettings(), indents()),
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

  const selectedParagraphs = createMemo(() => {
    const state = props.state();
    const paragraphs = getParagraphs(state);
    if (!paragraphs.length) return [];
    const range = normalizeSelection(state, paragraphs);
    return paragraphs.slice(range.startIndex, range.endIndex + 1);
  });
  const canPlaceTabs = (): boolean => {
    const state = props.state();
    if (props.readOnly() || (pageSettings().columns?.count ?? 1) > 1 ||
        !props.toolbarHost().commands.canExecute("setParagraphTabStops")) return false;
    const paragraphs = selectedParagraphs();
    return paragraphs.length > 0 && paragraphs.every(p => {
      const style = resolveEffectiveParagraphStyle(p.style, state.document.styles);
      return !style.bidi && (!style.textDirection || style.textDirection === "lrTb") &&
        !findParagraphTablePathLocation(state.document, p.id, getActiveSectionIndex(state));
    });
  };
  const commonTabs = createMemo((): EditorTabStop[] => {
    if (!canPlaceTabs()) return [];
    const lists = selectedParagraphs().map(p =>
      (resolveEffectiveParagraphStyle(p.style, props.state().document.styles).tabs ?? [])
        .filter(tab => tab.type !== "clear" && Number.isFinite(tab.position)),
    );
    return (lists[0] ?? []).filter(tab => lists.every(list =>
      list.some(other => Math.abs(other.position - tab.position) < TAB_POS_EPS &&
        other.type === tab.type && (other.leader ?? "none") === (tab.leader ?? "none")),
    )).filter(tab => {
      const x = tabPositionToPageX(tab.position, baseGeometry().contentLeft);
      return x >= 0 && x <= pageSettings().width;
    });
  });
  const tabLabel = (type: RulerTabType): string => {
    switch (type) {
      case "left": return t("paragraph.tabAlignLeft");
      case "center": return t("paragraph.tabAlignCenter");
      case "right": return t("paragraph.tabAlignRight");
      case "decimal": return t("paragraph.tabAlignDecimal");
      case "bar": return t("paragraph.tabAlignBar");
    }
  };
  const selectionKey = (): string => {
    const state = props.state();
    return JSON.stringify([state.activeSectionIndex, state.activeZone, state.selection]);
  };
  createEffect(() => {
    selectionKey();
    canPlaceTabs();
    // Selection changes, protection and unmount cancel uncommitted previews.
    cancelTabGesture?.();
  });

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

  const tabPositionAt = (clientX: number, free: boolean): number =>
    rulerPointerToTabPosition(clientX, pageRef?.getBoundingClientRect().left ?? 0,
      z(), baseGeometry().contentLeft, baseGeometry().contentRight, unit(), free);

  const commitTabs = (change: ParagraphTabStopsChange): void => {
    if (!canPlaceTabs()) return;
    props.toolbarHost().commands.execute("setParagraphTabStops", change);
    props.toolbarHost().focusEditor();
  };
  const cycleTabType = (): void => {
    setTabType(current => TAB_TYPES[(TAB_TYPES.indexOf(current) + 1) % TAB_TYPES.length]!);
  };
  const addTabAt = (position: number): void => {
    commitTabs({ set: [{ position, type: tabType() }] });
  };
  const addTabFromPointer = (event: PointerEvent): void => {
    if (!canPlaceTabs() || event.button !== 0 || !pageRef) return;
    event.preventDefault();
    event.stopPropagation();
    // Existing markers consume their own pointerdown.
    addTabAt(tabPositionAt(event.clientX, event.altKey));
  };
  const beginTabDrag = (stop: EditorTabStop, event: PointerEvent): void => {
    if (!canPlaceTabs() || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    cancelTabGesture?.();
    const key = selectionKey();
    const startX = event.clientX, startY = event.clientY;
    const target = event.currentTarget as HTMLElement;
    let moved = false;
    setTabDrag({ stop, position: stop.position, remove: false });

    const move = (e: PointerEvent): void => {
      if (e.pointerId !== event.pointerId) return;
      if (Math.hypot(e.clientX - startX, e.clientY - startY) > 3) moved = true;
      if (!moved) return;
      const rect = rulerRef?.getBoundingClientRect();
      setTabDrag({ stop, position: tabPositionAt(e.clientX, e.altKey),
        remove: !!rect && (e.clientY < rect.top - 8 || e.clientY > rect.bottom + 8) });
    };
    const cancel = (): void => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", pointerCancel);
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("blur", cancel);
      target.removeEventListener("lostpointercapture", pointerCancel);
      if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
      setTabDrag(null);
      cancelTabGesture = undefined;
    };
    const up = (e: PointerEvent): void => {
      if (e.pointerId !== event.pointerId) return;
      move(e);
      const pending = tabDrag();
      cancel();
      if (!moved || !pending || selectionKey() !== key || !canPlaceTabs()) return;
      if (pending.remove) commitTabs({ clear: [stop.position] });
      else if (Math.abs(pending.position - stop.position) >= TAB_POS_EPS)
        commitTabs({ clear: [stop.position], set: [{ ...stop, position: pending.position }] });
    };
    const pointerCancel = (e: PointerEvent): void => { if (e.pointerId === event.pointerId) cancel(); };
    const keydown = (e: KeyboardEvent): void => { if (e.key === "Escape") { e.preventDefault(); cancel(); } };
    cancelTabGesture = cancel;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", pointerCancel);
    window.addEventListener("keydown", keydown);
    window.addEventListener("blur", cancel);
    target.addEventListener("lostpointercapture", pointerCancel);
    target.setPointerCapture?.(event.pointerId);
  };
  const markerKey = (stop: EditorTabStop, event: KeyboardEvent): void => {
    if (!canPlaceTabs()) return;
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      commitTabs({ clear: [stop.position] });
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      const delta = event.key === "ArrowLeft" ? -1 : 1;
      const x = tabPositionToPageX(stop.position, baseGeometry().contentLeft);
      const step = unit() === "in" ? 12 : 96 / 25.4;
      const position = tabPositionAt((pageRef?.getBoundingClientRect().left ?? 0) + sx(x + delta * step), true);
      if (Math.abs(position - stop.position) >= TAB_POS_EPS)
        commitTabs({ clear: [stop.position], set: [{ ...stop, position }] });
    } else if (event.key === "Enter") {
      event.preventDefault();
      props.toolbarHost().commands.execute("openParagraphDialog", stop.position);
    }
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
    const finish = (commit: boolean): void => {
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onCancel);
      target.removeEventListener("lostpointercapture", onCancel);
      if (target.hasPointerCapture?.(event.pointerId)) target.releasePointerCapture(event.pointerId);
      if (commit && !props.readOnly()) commitDrag();
      setDrag(null);
    };
    const onUp = (): void => finish(true);
    const onCancel = (): void => finish(false);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onCancel);
    target.addEventListener("lostpointercapture", onCancel);
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
      ref={rulerRef}
      class="oasis-editor-horizontal-ruler"
      data-testid="editor-horizontal-ruler"
      role="presentation"
      aria-label={t("ruler.horizontal")}
    >
      <button type="button" class="oasis-editor-ruler-tab-selector"
        disabled={!canPlaceTabs()} title={`${t("ruler.tabSelector")}: ${tabLabel(tabType())}`}
        aria-label={`${t("ruler.tabSelector")}: ${tabLabel(tabType())}`}
        data-testid="editor-ruler-tab-selector" onClick={cycleTabType}>
        <TabGlyph type={tabType()} />
      </button>
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

          {/* Dedicated lane, below the indent controls. */}
          <button type="button" class="oasis-editor-ruler-tab-lane"
            disabled={!canPlaceTabs()}
            title={t("ruler.addTab")} aria-label={t("ruler.addTab")}
            data-testid="editor-ruler-tab-lane"
            style={{ left: `${sx(geometry().contentLeft)}px`,
              width: `${sx(Math.max(0, geometry().contentRight - geometry().contentLeft))}px` }}
            onPointerDown={addTabFromPointer}
            onClick={event => {
              if (event.detail === 0 && pageRef) {
                const middle = (baseGeometry().contentLeft + baseGeometry().contentRight) / 2;
                addTabAt(tabPositionAt(pageRef.getBoundingClientRect().left + sx(middle), false));
              }
            }}
          />
          <For each={commonTabs()}>
            {(stop): JSX.Element => {
              const moving = () => tabDrag()?.stop.position === stop.position;
              const position = () => moving() ? tabDrag()!.position : stop.position;
              return <button type="button" class="oasis-editor-ruler-tab-marker"
                classList={{ "oasis-editor-ruler-tab-removing": moving() && !!tabDrag()?.remove }}
                style={{ left: `${sx(tabPositionToPageX(position(), geometry().contentLeft))}px` }}
                title={`${tabLabel(stop.type as RulerTabType)} · ${stop.position.toFixed(2)} pt`}
                aria-label={`${tabLabel(stop.type as RulerTabType)} · ${stop.position.toFixed(2)} pt`}
                data-testid="editor-ruler-tab-marker"
                data-position-pt={stop.position}
                onPointerDown={event => beginTabDrag(stop, event)}
                onKeyDown={event => markerKey(stop, event)}
                onDblClick={event => {
                  event.preventDefault();
                  if (canPlaceTabs()) props.toolbarHost().commands.execute("openParagraphDialog", stop.position);
                }}>
                <TabGlyph type={stop.type as RulerTabType} />
              </button>;
            }}
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
