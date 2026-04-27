import { Component, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { store } from '../EditorStore.tsx';
import { dropdownManager } from './DropdownManager.js';
import { useI18n } from '../I18nContext.tsx';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
}

interface MenuDef {
  id: string;
  label: string;
  getItems: () => MenuItem[];
}

export const MenuBar: Component = () => {
  const { t } = useI18n();
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null);
  let menuBarRef: HTMLDivElement | undefined;

  const closeSelf = () => {
    setActiveMenu(null);
  };

  const handleDocumentClick = (e: MouseEvent) => {
    if (menuBarRef && !menuBarRef.contains(e.target as Node)) {
      closeSelf();
    }
  };

  onMount(() => {
    document.addEventListener('click', handleDocumentClick);
    dropdownManager.register(closeSelf);
    onCleanup(() => {
      document.removeEventListener('click', handleDocumentClick);
      dropdownManager.unregister(closeSelf);
    });
  });

  const toggleMenu = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    if (activeMenu() === id) {
      closeSelf();
    } else {
      dropdownManager.closeAll(closeSelf);
      setActiveMenu(id);
    }
  };

  const executeAction = (action?: () => void) => {
    closeSelf();
    if (action) action();
  };

  const menus: MenuDef[] = [
    {
      id: 'file', label: t('menu', 'file'), getItems: () => {
        const events = store.events;
        return [
          { label: t('menu', 'new'), action: () => events?.onNew?.() },
          { label: t('menu', 'open'), action: () => events?.onOpen?.() },
          { separator: true, label: "" },
          { label: t('menu', 'importDocx'), action: () => document.getElementById("oasis-editor-import-docx-input")?.click() },
          { label: t('menu', 'exportDocx'), action: () => events?.onExportDocx?.() },
          { label: t('menu', 'exportPdf'), action: () => events?.onExportPdf?.() },
          { label: t('menu', 'download'), action: () => events?.onDownload?.() },
          { separator: true, label: "" },
          { label: t('toolbar', 'print'), shortcut: "Ctrl+P", action: () => (events?.onPrint ? events.onPrint() : window.print()) },
        ];
      }
    },
    {
      id: 'edit', label: t('menu', 'edit'), getItems: () => {
        const events = store.events;
        return [
          { label: t('toolbar', 'undo'), shortcut: "Ctrl+Z", action: () => events?.onUndo() },
          { label: t('toolbar', 'redo'), shortcut: "Ctrl+Y", action: () => events?.onRedo() },
          { separator: true, label: "" },
          { label: t('menu', 'cut'), shortcut: "Ctrl+X", action: async () => {
            try { await navigator.clipboard.writeText(window.getSelection()?.toString() ?? ""); }
            catch { document.execCommand("cut"); }
          }},
          { label: t('menu', 'copy'), shortcut: "Ctrl+C", action: async () => {
            try { await navigator.clipboard.writeText(window.getSelection()?.toString() ?? ""); }
            catch { document.execCommand("copy"); }
          }},
          { label: t('menu', 'paste'), shortcut: "Ctrl+V", action: async () => {
            try {
              const text = await navigator.clipboard.readText();
              events?.onPaste?.(text);
            } catch {
              // Fallback
            }
          }},
        ];
      }
    },
    {
      id: 'insert', label: t('menu', 'insert'), getItems: () => {
        const events = store.events;
        return [
          { label: t('menu', 'image'), action: () => document.getElementById("oasis-editor-image-input")?.click() },
          { label: t('menu', 'pageBreak'), action: () => events?.onInsertPageBreak?.() },
          { separator: true, label: "" },
          { label: t('menu', 'footnote'), action: () => events?.onInsertFootnote?.() },
          { label: t('menu', 'endnote'), action: () => events?.onInsertEndnote?.() },
          { label: t('menu', 'pageNumber'), action: () => events?.onInsertPageNumber?.() },
          { separator: true, label: "" },
          { label: t('menu', 'horizontalLine'), action: () => events?.onInsertHr?.() },
        ];
      }
    },
    {
      id: 'format', label: t('menu', 'format'), getItems: () => {
        const events = store.events;
        return [
          { label: t('toolbar', 'bold'), shortcut: "Ctrl+B", action: () => events?.onBold() },
          { label: t('toolbar', 'italic'), shortcut: "Ctrl+I", action: () => events?.onItalic() },
          { label: t('toolbar', 'underline'), shortcut: "Ctrl+U", action: () => events?.onUnderline() },
          { separator: true, label: "" },
          { label: t('toolbar', 'alignLeft'), action: () => events?.onAlign("left") },
          { label: t('toolbar', 'alignCenter'), action: () => events?.onAlign("center") },
          { label: t('toolbar', 'alignRight'), action: () => events?.onAlign("right") },
          { label: t('toolbar', 'alignJustify'), action: () => events?.onAlign("justify") },
        ];
      }
    }
  ];

  return (
    <div class="oasis-editor-menu-bar" ref={menuBarRef}>
      <For each={menus}>
        {(menu) => (
          <div style={{ position: 'relative' }}>
            <span
              class={activeMenu() === menu.id ? 'active' : ''}
              onClick={(e) => toggleMenu(menu.id, e)}
            >
              {menu.label}
            </span>
            <Show when={activeMenu() === menu.id}>
              <div class="oasis-dropdown-menu show" style={{ top: '100%', left: '0' }}>
                <For each={menu.getItems()}>
                  {(item) => (
                    item.separator ? (
                      <div class="oasis-dropdown-separator" />
                    ) : (
                      <div class="oasis-dropdown-item" onClick={() => executeAction(item.action)}>
                        <span>{item.label}</span>
                        <Show when={item.shortcut}>
                          <span class="shortcut">{item.shortcut}</span>
                        </Show>
                      </div>
                    )
                  )}
                </For>
              </div>
            </Show>
          </div>
        )}
      </For>
    </div>
  );
};
