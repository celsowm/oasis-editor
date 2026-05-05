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
import "./defaultMenuItems.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";

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
      role="menubar"
    >
      <For each={topLevelItems}>
        {(topLevel) => (
          <div
            class="oasis-menubar-menu"
            onMouseEnter={() => {
              if (activeMenu() && activeMenu() !== topLevel.id) {
                setActiveMenu(topLevel.id);
              }
            }}
          >
            <div
              class="oasis-menubar-button"
              classList={{ "oasis-menubar-button-active": activeMenu() === topLevel.id }}
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
        class="oasis-menubar-separator"
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
      class="oasis-menubar-item"
      onMouseEnter={() => {
        if (hasChildren) setShowSub(true);
      }}
      onMouseLeave={() => {
        if (hasChildren) setShowSub(false);
      }}
      onClick={handleClick}
      role="menuitem"
      aria-haspopup={hasChildren}
      aria-expanded={showSub()}
    >
      <span>{label}</span>
      <Show when={node.item?.shortcut}>
        <span class="oasis-menubar-shortcut">
          {node.item!.shortcut}
        </span>
      </Show>
      <Show when={hasChildren}>
        <i class="oasis-menubar-submenu-icon" data-lucide="chevron-right" />
      </Show>

      <Show when={showSub() && hasChildren}>
        <div
          class="oasis-menubar-submenu"
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
