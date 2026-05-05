import {
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  type JSX,
} from "solid-js";
import { t, type TranslationKey } from "../../../i18n/index.js";
import { type MenuItem, defaultMenuRegistry } from "./menuRegistry.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";
import type { EditorCommandsControllerDeps } from "../../../app/controllers/EditorCommandsController.js";

export interface MenubarProps {
  ctx: EditorToolbarCtx;
  // Passing commandsController or other deps as needed
}

interface MenuTreeItem {
  id: string;
  label: string;
  children: MenuTreeItem[];
  item?: MenuItem;
}

export function Menubar(props: MenubarProps) {
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

  const menuItems = defaultMenuRegistry.getItems();

  // Build tree from paths (e.g. "File/New")
  const menuTree: MenuTreeItem[] = [];

  for (const item of menuItems) {
    const parts = item.path.split("/");
    let currentLevel = menuTree;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      let existingNode = currentLevel.find((n) => n.label === part);
      if (!existingNode) {
        existingNode = {
          id: part,
          label: part,
          children: [],
        };
        currentLevel.push(existingNode);
      }
      if (i === parts.length - 1) {
        existingNode.item = item;
      }
      currentLevel = existingNode.children;
    }
  }

  const handleDocumentClick = (e: MouseEvent) => {
    // Basic click outside
    if (activeMenu() && !(e.target as Element).closest(".oasis-menubar")) {
      setActiveMenu(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setActiveMenu(null);
    }
  };

  onMount(() => {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleKeyDown);
  });

  const topLevelItems = menuTree;

  return (
    <div
      class="oasis-menubar"
      style={{
        display: "flex",
        "align-items": "center",
        padding: "0 8px",
        height: "28px",
        "background-color": "var(--oasis-toolbar-bg)",
        "border-bottom": "1px solid var(--oasis-toolbar-border)",
        "font-size": "13px",
        "user-select": "none",
        "font-family": "var(--oasis-font-ui)",
        color: "var(--oasis-text)",
      }}
      role="menubar"
    >
      <For each={topLevelItems}>
        {(topLevel) => (
          <div
            class="oasis-menubar-menu"
            style={{ position: "relative" }}
            onMouseEnter={() => {
              if (activeMenu() && activeMenu() !== topLevel.id) {
                setActiveMenu(topLevel.id);
              }
            }}
          >
            <div
              class="oasis-menubar-button"
              style={{
                padding: "4px 8px",
                cursor: "pointer",
                "border-radius": "4px",
                "background-color":
                  activeMenu() === topLevel.id
                    ? "var(--oasis-accent-soft)"
                    : "transparent",
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (activeMenu() === topLevel.id) {
                  setActiveMenu(null);
                } else {
                  setActiveMenu(topLevel.id);
                }
              }}
              role="menuitem"
              aria-haspopup="true"
              aria-expanded={activeMenu() === topLevel.id}
            >
              {t(("menu." + topLevel.label.toLowerCase()) as TranslationKey) ||
                topLevel.label}
            </div>

            <Show when={activeMenu() === topLevel.id}>
              <div
                class="oasis-menubar-dropdown"
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "0",
                  "background-color": "var(--oasis-paper)",
                  border: "1px solid var(--oasis-toolbar-border)",
                  "box-shadow": "var(--oasis-paper-shadow)",
                  "border-radius": "4px",
                  padding: "4px 0",
                  "min-width": "200px",
                  "z-index": "100",
                  display: "flex",
                  "flex-direction": "column",
                }}
                role="menu"
              >
                <For each={topLevel.children}>
                  {(child) => (
                    <MenuNode
                      node={child}
                      ctx={props.ctx}
                      onClose={() => setActiveMenu(null)}
                    />
                  )}
                </For>
              </div>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
}

function MenuNode(props: {
  node: MenuTreeItem;
  ctx: EditorToolbarCtx;
  onClose: () => void;
}) {
  const { node, ctx, onClose } = props;
  const isSeparator = node.item?.separator;

  if (isSeparator) {
    return (
      <div
        style={{
          height: "1px",
          "background-color": "var(--oasis-toolbar-border)",
          margin: "4px 0",
        }}
        role="separator"
      />
    );
  }

  const hasChildren = node.children.length > 0;
  const [showSub, setShowSub] = createSignal(false);

  // Determine label. Try labelKey first, fallback to node.label
  let label = node.label;
  if (node.item?.labelKey) {
    label = t(node.item.labelKey) || node.label;
  }

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) return;
    
    if (node.item?.action) {
      node.item.action(ctx);
    } else if (node.item?.command) {
      // Execute command using context, for now placeholder
      console.log("Execute command:", node.item.command);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: "relative",
        padding: "6px 16px",
        cursor: "pointer",
        display: "flex",
        "justify-content": "space-between",
        "align-items": "center",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--oasis-accent-soft)";
        if (hasChildren) setShowSub(true);
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
        if (hasChildren) setShowSub(false);
      }}
      onClick={handleClick}
      role="menuitem"
      aria-haspopup={hasChildren}
      aria-expanded={showSub()}
    >
      <span>{label}</span>
      <Show when={node.item?.shortcut}>
        <span style={{ "margin-left": "16px", color: "var(--oasis-text-muted)" }}>
          {node.item!.shortcut}
        </span>
      </Show>
      <Show when={hasChildren}>
        <span style={{ "margin-left": "16px" }}>▶</span>
      </Show>

      <Show when={showSub() && hasChildren}>
        <div
          style={{
            position: "absolute",
            top: "-4px",
            left: "100%",
            "background-color": "var(--oasis-paper)",
            border: "1px solid var(--oasis-toolbar-border)",
            "box-shadow": "var(--oasis-paper-shadow)",
            "border-radius": "4px",
            padding: "4px 0",
            "min-width": "160px",
            "z-index": "100",
            display: "flex",
            "flex-direction": "column",
          }}
          role="menu"
        >
          <For each={node.children}>
            {(child) => (
              <MenuNode node={child} ctx={ctx} onClose={onClose} />
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
