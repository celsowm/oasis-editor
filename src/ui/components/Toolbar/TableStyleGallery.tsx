import {
  For,
  Show,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
} from "solid-js";
import type { ToolbarActionApi, ToolbarDocumentStyle } from "./schema/items.js";
import { Popover } from "./primitives/Popover.js";
import { DropdownChevron } from "./primitives/DropdownChevron.js";
import { SurfaceButton } from "@/ui/public/SurfaceButton.js";
import { Text } from "@/ui/public/Text.js";

export interface TableStyleGalleryProps {
  api: ToolbarActionApi;
  styles: ToolbarDocumentStyle[];
  testId?: string;
}

const tableStyles = (styles: ToolbarDocumentStyle[]): ToolbarDocumentStyle[] =>
  styles
    .filter((style): boolean => style.type === "table")
    .map((style, index) => ({ style, index }))
    .sort(
      (a, b) =>
        (a.style.uiPriority ?? Number.MAX_SAFE_INTEGER) -
          (b.style.uiPriority ?? Number.MAX_SAFE_INTEGER) || a.index - b.index,
    )
    .map(({ style }) => style);

export function TableStyleGallery(props: TableStyleGalleryProps): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const testId = (): string => props.testId ?? "editor-toolbar-tbl-style";
  const panelTestId = (): string => `${testId()}-panel`;
  const styles = createMemo(() => tableStyles(props.styles));
  const activeId = (): string =>
    String(props.api.commands.state("setTableStyle").value ?? "");
  const isActive = (style: ToolbarDocumentStyle): boolean =>
    style.id === activeId();
  const apply = (style: ToolbarDocumentStyle): void => {
    if (!props.api.commands.canExecute("setTableStyle")) return;
    props.api.commands.execute("setTableStyle", style.id);
    setOpen(false);
    props.api.focusEditor();
  };

  createEffect((): void => {
    if (!open()) return;
    queueMicrotask((): void => {
      document
        .querySelector<HTMLButtonElement>(
          `[data-testid="${panelTestId()}"] .oasis-editor-table-style-card-active, ` +
            `[data-testid="${panelTestId()}"] .oasis-editor-table-style-card`,
        )
        ?.focus();
    });
  });

  const onPanelKeyDown: JSX.EventHandler<HTMLDivElement, KeyboardEvent> = (
    event,
  ): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    const cards = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        ".oasis-editor-table-style-card",
      ),
    );
    const current = cards.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;
    const columns = 4;
    const move: Record<string, number | undefined> = {
      ArrowLeft: current - 1,
      ArrowRight: current + 1,
      ArrowUp: current - columns,
      ArrowDown: current + columns,
      Home: 0,
      End: cards.length - 1,
    };
    const next = move[event.key];
    if (next === undefined) return;
    event.preventDefault();
    cards[Math.max(0, Math.min(cards.length - 1, next))]?.focus();
  };

  const cards = (): JSX.Element => (
    <For each={styles()}>
      {(style): JSX.Element => {
        const preview = (): NonNullable<ToolbarDocumentStyle["tablePreview"]> =>
          style.tablePreview ?? {};
        return (
          <SurfaceButton
            class="oasis-editor-table-style-card"
            active={isActive(style)}
            classList={{
              "oasis-editor-table-style-card-active": isActive(style),
            }}
            role="option"
            aria-selected={isActive(style)}
            title={style.name}
            label={style.name}
            data-style-id={style.id}
            onClick={(): void => apply(style)}
          >
            <Text
              class="oasis-editor-table-style-preview"
              style={{
                "--table-fill": preview().wholeFill ?? "#ffffff",
                "--table-header-fill":
                  preview().headerFill ?? preview().wholeFill ?? "#d9eaf7",
                "--table-band-fill":
                  preview().bandFill ?? preview().wholeFill ?? "#f4f8fb",
                "--table-border": preview().borderColor ?? "#91a5b5",
                "--table-header-color": preview().headerColor ?? "#17212b",
              }}
            >
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </Text>
            <Text class="oasis-editor-table-style-card-label">
              {style.name}
            </Text>
          </SurfaceButton>
        );
      }}
    </For>
  );

  return (
    <Show
      when={styles().length > 0}
      fallback={
        <Text class="oasis-editor-table-style-gallery-empty">
          {props.api.t("table.tableStyle")}
        </Text>
      }
    >
      <Popover
        open={open()}
        onOpenChange={setOpen}
        placement="bottom-end"
        panelClass="oasis-editor-table-style-gallery-panel"
        panelRole="listbox"
        panelTestId={panelTestId()}
        trigger={(popover): JSX.Element => (
          <div ref={popover.ref} class="oasis-editor-table-style-gallery">
            <div class="oasis-editor-table-style-strip" role="listbox">
              {cards()}
            </div>
            <SurfaceButton
              class="oasis-editor-table-style-expand"
              label={props.api.t("table.tableStyle")}
              aria-haspopup="listbox"
              aria-expanded={popover.open}
              data-testid={`${testId()}-expand`}
              onClick={(): void => popover.toggle()}
            >
              <DropdownChevron />
            </SurfaceButton>
          </div>
        )}
      >
        <div class="oasis-editor-table-style-grid" onKeyDown={onPanelKeyDown}>
          {cards()}
        </div>
      </Popover>
    </Show>
  );
}
