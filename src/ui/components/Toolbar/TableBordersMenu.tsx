import { For, createSignal, type JSX } from "solid-js";
import type { TableBorderPreset } from "@/core/commands/table.js";
import type { ToolbarActionApi } from "./schema/items.js";
import { Popover } from "./primitives/Popover.js";
import { Button } from "./primitives/Button.js";
import { DropdownChevron } from "./primitives/DropdownChevron.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import { SurfaceButton } from "@/ui/public/SurfaceButton.js";
import { Text } from "@/ui/public/Text.js";

type MenuItem = { preset: TableBorderPreset; label: string };
const GROUPS: MenuItem[][] = [
  [
    { preset: "bottom", label: "Borda Inferior" },
    { preset: "top", label: "Borda Superior" },
    { preset: "left", label: "Borda Esquerda" },
    { preset: "right", label: "Borda Direita" },
    { preset: "none", label: "Sem Borda" },
  ],
  [
    { preset: "all", label: "Todas as Bordas" },
    { preset: "outside", label: "Bordas Externas" },
    { preset: "inside", label: "Bordas Internas" },
  ],
  [
    { preset: "insideHorizontal", label: "Borda Horizontal Interna" },
    { preset: "insideVertical", label: "Borda Vertical Interna" },
    { preset: "diagonalDown", label: "Borda Diagonal Inferior" },
    { preset: "diagonalUp", label: "Borda Diagonal Superior" },
  ],
];

function Preview(props: { preset: TableBorderPreset }): JSX.Element {
  const p = props.preset;
  return (
    <svg
      class="oasis-editor-table-border-preset-icon"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-opacity=".45"
        stroke-dasharray="1.5 1.5"
      />
      {p !== "none" && (
        <>
          {(["all", "outside", "top"] as TableBorderPreset[]).includes(p) && (
            <path d="M2 2h16" />
          )}
          {(["all", "outside", "bottom"] as TableBorderPreset[]).includes(
            p,
          ) && <path d="M2 18h16" />}
          {(["all", "outside", "left"] as TableBorderPreset[]).includes(p) && (
            <path d="M2 2v16" />
          )}
          {(["all", "outside", "right"] as TableBorderPreset[]).includes(p) && (
            <path d="M18 2v16" />
          )}
          {(
            ["all", "inside", "insideHorizontal"] as TableBorderPreset[]
          ).includes(p) && <path d="M2 10h16" />}
          {(
            ["all", "inside", "insideVertical"] as TableBorderPreset[]
          ).includes(p) && <path d="M10 2v16" />}
          {p === "diagonalDown" && <path d="M2 2l16 16" />}
          {p === "diagonalUp" && <path d="M2 18 18 2" />}
        </>
      )}
    </svg>
  );
}

export function TableBordersMenu(props: {
  api: ToolbarActionApi;
}): JSX.Element {
  const [open, setOpen] = createSignal(false);
  const apply = (preset: TableBorderPreset): void => {
    props.api.commands.execute("tableApplyBorderPreset", preset);
    setOpen(false);
    props.api.focusEditor();
  };
  return (
    <Popover
      open={open()}
      onOpenChange={setOpen}
      panelRole="menu"
      panelClass="oasis-editor-table-borders-menu"
      trigger={(popover): JSX.Element => (
        <Button
          ref={popover.ref}
          class="oasis-editor-table-borders-trigger"
          active={popover.open}
          aria-haspopup="menu"
          aria-expanded={popover.open}
          tooltip="Bordas"
          onClick={(): void => popover.toggle()}
        >
          <ToolIcon name="tableBorders" />
          <Text>Bordas</Text>
          <DropdownChevron />
        </Button>
      )}
    >
      <For each={GROUPS}>
        {(group, index): JSX.Element => (
          <div class="oasis-editor-table-borders-section">
            <For each={group}>
              {(item): JSX.Element => (
                <SurfaceButton
                  class="oasis-editor-table-borders-action"
                  role="menuitem"
                  label={item.label}
                  onClick={(): void => apply(item.preset)}
                >
                  <Preview preset={item.preset} />
                  <Text>{item.label}</Text>
                </SurfaceButton>
              )}
            </For>
            {index() < GROUPS.length - 1 && (
              <div class="oasis-editor-table-borders-divider" />
            )}
          </div>
        )}
      </For>
      <div class="oasis-editor-table-borders-divider" />
      <SurfaceButton
        class="oasis-editor-table-borders-action"
        role="menuitem"
        label="Linha Horizontal"
        onClick={(): void => apply("bottom")}
      >
        <Text class="oasis-editor-table-borders-text-icon">A</Text>
        <Text>Linha Horizontal</Text>
      </SurfaceButton>
      <SurfaceButton
        class="oasis-editor-table-borders-action"
        role="menuitem"
        label="Desenhar Tabela"
        onClick={(): void => {
          props.api.commands.execute("toggleTableDrawBorders");
          setOpen(false);
        }}
      >
        <ToolIcon name="tableBorders" />
        <Text>Desenhar Tabela</Text>
      </SurfaceButton>
      <SurfaceButton
        class="oasis-editor-table-borders-action"
        role="menuitem"
        label="Exibir Linhas de Grade"
        onClick={(): void => {
          props.api.commands.execute("toggleTableGridlines");
          setOpen(false);
        }}
      >
        <ToolIcon name="tableBorders" />
        <Text>Exibir Linhas de Grade</Text>
      </SurfaceButton>
      <SurfaceButton
        class="oasis-editor-table-borders-action"
        role="menuitem"
        label="Bordas e Sombreamento…"
        onClick={(): void => {
          props.api.commands.execute("tableCellBorders");
        }}
      >
        <ToolIcon name="tableBorders" />
        <Text>Bordas e Sombreamento…</Text>
      </SurfaceButton>
    </Popover>
  );
}
