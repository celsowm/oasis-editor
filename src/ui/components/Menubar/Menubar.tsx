import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { type TranslationKey } from "@/i18n/index.js";
import { useI18n } from "@/i18n/I18nContext.js";
import {
  MenuRegistry,
  type MenuItem,
  type MenubarHost,
} from "./menuRegistry.js";
import { SurfaceButton } from "@/ui/public/SurfaceButton.js";
import { Text } from "@/ui/public/Text.js";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import { JSX } from "solid-js";

export interface MenubarProps {
  host: () => MenubarHost;
  registry: MenuRegistry;
}

interface MenuTreeItem {
  id: string;
  path: string;
  label: string;
  children: MenuTreeItem[];
  item?: MenuItem;
}

export function Menubar(props: MenubarProps): JSX.Element {
  const t = useI18n();
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null);

  const menuItems = (): MenuItem[] => props.registry.getItems();
  const visibleMenuItems = (): MenuItem[] =>
    menuItems().filter((item): boolean => !item.hidden);
  const itemByPath = (): Map<string, MenuItem> =>
    new Map(
      visibleMenuItems().map((item): [string, MenuItem] => [item.path, item]),
    );

  // Build tree from paths (e.g. "File/New")
  const menuTree = (): MenuTreeItem[] => {
    const tree: MenuTreeItem[] = [];
    const byPath = itemByPath();

    for (const item of visibleMenuItems()) {
      const parts = item.path.split("/");
      let currentLevel = tree;
      let currentPath = "";
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let existingNode = currentLevel.find((n): boolean => n.label === part);
        if (!existingNode) {
          existingNode = {
            id: part,
            path: currentPath,
            label: part,
            children: [],
          };
          currentLevel.push(existingNode);
        }
        const matchingItem = byPath.get(currentPath);
        if (matchingItem) {
          existingNode.item = matchingItem;
        }
        currentLevel = existingNode.children;
      }
    }
    return tree;
  };

  const pruneTree = (nodes: MenuTreeItem[]): MenuTreeItem[] =>
    nodes.flatMap((node) => {
      const children = pruneTree(node.children);
      const isExecutable = Boolean(node.item?.command) && !node.item?.separator;
      if (!isExecutable && children.length === 0) {
        return [];
      }
      return [{ ...node, children }];
    });

  const handleDocumentClick = (e: MouseEvent): void => {
    // Basic click outside
    if (activeMenu() && !(e.target as Element).closest(".oasis-menubar")) {
      setActiveMenu(null);
    }
  };

  const handleKeyDown = (e: KeyboardEvent): void => {
    if (e.key === "Escape") {
      setActiveMenu(null);
    }
  };

  onMount((): void => {
    document.addEventListener("click", handleDocumentClick);
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup((): void => {
    document.removeEventListener("click", handleDocumentClick);
    document.removeEventListener("keydown", handleKeyDown);
  });

  const topLevelItems = (): MenuTreeItem[] => pruneTree(menuTree());

  return (
    <div class="oasis-menubar" role="menubar">
      <For each={topLevelItems()}>
        {(topLevel): JSX.Element => (
          <div
            class="oasis-menubar-menu"
            onMouseEnter={(): void => {
              if (activeMenu() && activeMenu() !== topLevel.id) {
                setActiveMenu(topLevel.id);
              }
            }}
          >
            <SurfaceButton
              class="oasis-menubar-button"
              classList={{
                "oasis-menubar-button-active": activeMenu() === topLevel.id,
              }}
              onClick={(e): void => {
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
            </SurfaceButton>

            <Show when={activeMenu() === topLevel.id}>
              <div class="oasis-menubar-dropdown" role="menu">
                <For each={topLevel.children}>
                  {(child): JSX.Element => (
                    <MenuNode
                      node={child}
                      host={props.host}
                      onClose={(): null => setActiveMenu(null)}
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
  host: () => MenubarHost;
  onClose: () => void;
}): JSX.Element {
  const t = useI18n();
  const { node, onClose } = props;
  const isSeparator = node.item?.separator;

  if (isSeparator) {
    return <div class="oasis-menubar-separator" role="separator" />;
  }

  const hasChildren = node.children.length > 0;
  const [showSub, setShowSub] = createSignal(false);

  // Determine label. Try labelKey first, fallback to node.label
  let label = node.label;
  if (node.item?.labelKey) {
    label = t(node.item.labelKey) || node.label;
  }
  const rawIcon = node.item?.icon;
  const icon = (): string | undefined =>
    typeof rawIcon === "function" ? rawIcon(props.host()) : rawIcon;

  const handleClick = (e: MouseEvent): void => {
    e.stopPropagation();
    if (hasChildren) return;

    const command = node.item?.command;
    if (command && props.host().commands.canExecute(command) !== false) {
      props.host().commands.execute(command);
    }
    onClose();
  };

  return (
    <SurfaceButton
      class="oasis-menubar-item"
      label={label}
      onMouseEnter={(): void => {
        if (hasChildren) setShowSub(true);
      }}
      onMouseLeave={(): void => {
        if (hasChildren) setShowSub(false);
      }}
      onClick={handleClick}
      role="menuitem"
      aria-haspopup={hasChildren}
      aria-expanded={showSub()}
    >
      <Text class="oasis-menubar-item-main">
        <Show when={icon()}>
          <Text class="oasis-menubar-item-icon" aria-hidden="true">
            <ToolIcon name={icon()!} />
          </Text>
        </Show>
        <Text>{label}</Text>
      </Text>
      <Show when={node.item?.shortcut}>
        <Text class="oasis-menubar-shortcut">{node.item!.shortcut}</Text>
      </Show>
      <Show when={hasChildren}>
        <i class="oasis-menubar-submenu-icon" data-lucide="chevron-right" />
      </Show>

      <Show when={showSub() && hasChildren}>
        <div class="oasis-menubar-submenu" role="menu">
          <For each={node.children}>
            {(child): JSX.Element => (
              <MenuNode node={child} host={props.host} onClose={onClose} />
            )}
          </For>
        </div>
      </Show>
    </SurfaceButton>
  );
}
