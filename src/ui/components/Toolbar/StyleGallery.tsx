import {
  For,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
} from "solid-js";
import type {
  StyleGalleryItem,
  ToolbarActionApi,
  ToolbarDocumentStyle,
} from "./schema/items.js";
import { Popover } from "./primitives/Popover.js";
import { Select } from "./primitives/Select.js";

export function getQuickStyles(
  styles: ToolbarDocumentStyle[],
): ToolbarDocumentStyle[] {
  const applicable = styles.filter(
    (style): boolean | undefined =>
      style.type !== "table" &&
      (!style.semiHidden || (style.unhideWhenUsed && style.isUsed)),
  );
  const hasQuickStyles = applicable.some((style): boolean => style.qFormat === true);
  return applicable
    .filter((style): boolean => !hasQuickStyles || style.qFormat === true)
    .map((style, index): { style: ToolbarDocumentStyle; index: number; } => ({ style, index }))
    .sort(
      (a, b): number =>
        (a.style.uiPriority ?? Number.MAX_SAFE_INTEGER) -
          (b.style.uiPriority ?? Number.MAX_SAFE_INTEGER) || a.index - b.index,
    )
    .map(({ style }): ToolbarDocumentStyle => style);
}

function previewStyle(style: ToolbarDocumentStyle): JSX.CSSProperties {
  const fontSize = Math.min(28, Math.max(12, style.fontSize ?? 14));
  return {
    "font-family": style.fontFamily,
    "font-size": `${fontSize}px`,
    color: style.color,
    "font-weight": style.bold ? "700" : "400",
    "font-style": style.italic ? "italic" : "normal",
  };
}

export interface StyleGalleryProps {
  item: StyleGalleryItem;
  api: ToolbarActionApi;
}

export function StyleGallery(props: StyleGalleryProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const panelTestId = `${props.item.testId ?? props.item.id}-panel`;
  const expandTestId = `${props.item.testId ?? props.item.id}-expand`;
  const styles = createMemo((): ToolbarDocumentStyle[] => getQuickStyles(props.item.styles(props.api)));
  const paragraphStyleId = (): string =>
    String(props.api.commands.state(props.item.paragraphCommand).value ?? "");
  const characterStyleId = (): string =>
    String(props.api.commands.state(props.item.characterCommand).value ?? "");

  createEffect((): void => {
    if (!open()) return;
    queueMicrotask((): void => {
      const panel = document.querySelector<HTMLElement>(
        `[data-testid="${panelTestId}"]`,
      );
      const target =
        panel?.querySelector<HTMLButtonElement>(
          ".oasis-editor-style-gallery-card-active",
        ) ??
        panel?.querySelector<HTMLButtonElement>(
          ".oasis-editor-style-gallery-card",
        );
      target?.focus();
    });
  });
  const isActive = (style: ToolbarDocumentStyle): boolean =>
    style.type === "character"
      ? characterStyleId() === style.id
      : paragraphStyleId() === style.id;
  const apply = (style: ToolbarDocumentStyle): void => {
    const command =
      style.type === "character"
        ? props.item.characterCommand
        : props.item.paragraphCommand;
    if (props.api.commands.canExecute(command)) {
      props.api.commands.execute(command, style.id);
      setOpen(false);
      props.api.focusEditor();
    }
  };

  const onPanelKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (
    event,
  ): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      window.setTimeout(
        (): void | undefined =>
          document
            .querySelector<HTMLButtonElement>(`[data-testid="${expandTestId}"]`)
            ?.focus(),
        0,
      );
      return;
    }
    const buttons = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        ".oasis-editor-style-gallery-card",
      ),
    );
    const current = buttons.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    if (current < 0 || buttons.length === 0) return;
    const renderedColumns = getComputedStyle(event.currentTarget)
      .gridTemplateColumns.split(" ")
      .filter(Boolean).length;
    const columns = renderedColumns > 0 ? renderedColumns : 6;
    const moves: Partial<Record<string, number>> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - columns,
      ArrowDown: current + columns,
      Home: 0,
      End: buttons.length - 1,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    buttons[Math.min(buttons.length - 1, Math.max(0, next))]?.focus();
  };

  const cards = (): JSX.Element => (
    <For each={styles()}>
      {(style): JSX.Element => (
        <button
          type="button"
          class="oasis-editor-style-gallery-card"
          classList={{
            "oasis-editor-style-gallery-card-active": isActive(style),
          }}
          style={previewStyle(style)}
          title={style.name}
          role="option"
          aria-selected={isActive(style)}
          data-style-id={style.id}
          onClick={(): void => apply(style)}
        >
          <span>{style.name}</span>
        </button>
      )}
    </For>
  );

  return (
    <Popover
      open={open()}
      onOpenChange={setOpen}
      placement="bottom-end"
      panelClass="oasis-editor-style-gallery-panel"
      panelRole="listbox"
      panelTestId={panelTestId}
      trigger={(popover): JSX.Element => (
        <div ref={popover.ref} class="oasis-editor-style-gallery">
          <Select
            class="oasis-editor-style-gallery-compact"
            value={characterStyleId() || paragraphStyleId()}
            data-testid={props.item.testId}
            tooltip={props.api.t("toolbar.style")}
            onChange={(event): void => {
              const style = styles().find(
                (candidate): boolean => candidate.id === event.currentTarget.value,
              );
              if (style) apply(style);
            }}
          >
            <For each={styles()}>
              {(style): JSX.Element => <option value={style.id}>{style.name}</option>}
            </For>
          </Select>
          <div class="oasis-editor-style-gallery-ribbon">
            <div class="oasis-editor-style-gallery-strip" role="listbox">
              {cards()}
            </div>
            <button
              type="button"
              class="oasis-editor-style-gallery-expand"
              title={props.api.t("toolbar.style")}
              aria-label={props.api.t("toolbar.style")}
              aria-haspopup="listbox"
              aria-expanded={popover.open}
              data-testid={expandTestId}
              onClick={(): void => popover.toggle()}
            >
              <i data-lucide="chevron-down" />
            </button>
          </div>
        </div>
      )}
    >
      <div class="oasis-editor-style-gallery-grid" onKeyDown={onPanelKeyDown}>
        {cards()}
      </div>
    </Popover>
  );
}
