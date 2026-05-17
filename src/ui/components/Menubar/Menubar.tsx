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
  path: string;
  label: string;
  children: MenuTreeItem[];
  item?: MenuItem;
}

export function Menubar(props: MenubarProps) {
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

  const menuItems = defaultMenuRegistry.getItems();
  const visibleMenuItems = menuItems.filter((item) => !item.hidden);
  const itemByPath = new Map(visibleMenuItems.map((item) => [item.path, item]));

  // Build tree from paths (e.g. "File/New")
  const menuTree: MenuTreeItem[] = [];

  for (const item of visibleMenuItems) {
    const parts = item.path.split("/");
    let currentLevel = menuTree;
    let currentPath = "";
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      let existingNode = currentLevel.find((n) => n.label === part);
      if (!existingNode) {
        existingNode = {
          id: part,
          path: currentPath,
          label: part,
          children: [],
        };
        currentLevel.push(existingNode);
      }
      const matchingItem = itemByPath.get(currentPath);
      if (matchingItem) {
        existingNode.item = matchingItem;
      }
      currentLevel = existingNode.children;
    }
  }

  const pruneTree = (nodes: MenuTreeItem[]): MenuTreeItem[] =>
    nodes.flatMap((node) => {
      const children = pruneTree(node.children);
      const isExecutable = Boolean(node.item?.action) && !node.item?.separator;
      if (!isExecutable && children.length === 0) {
        return [];
      }
      return [{ ...node, children }];
    });

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

  const topLevelItems = pruneTree(menuTree);

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
  const rawIcon = node.item?.icon;
  const icon = () => typeof rawIcon === "function" ? rawIcon(ctx) : rawIcon;

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) return;
    
    if (node.item?.action) {
      void node.item.action(ctx);
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
      <span class="oasis-menubar-item-main">
        <Show when={icon()}>
          <span class="oasis-menubar-item-icon" aria-hidden="true">
            <i data-lucide={icon()!} />
          </span>
        </Show>
        <span>{label}</span>
      </span>
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
