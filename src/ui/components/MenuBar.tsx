import { Component, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import { store } from '../EditorStore.tsx';

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
  const [activeMenu, setActiveMenu] = createSignal<string | null>(null);
  let menuBarRef: HTMLDivElement | undefined;

  const handleDocumentClick = (e: MouseEvent) => {
    if (menuBarRef && !menuBarRef.contains(e.target as Node)) {
      setActiveMenu(null);
    }
  };

  onMount(() => {
    document.addEventListener('click', handleDocumentClick);
  });

  onCleanup(() => {
    document.removeEventListener('click', handleDocumentClick);
  });

  const toggleMenu = (id: string, e: MouseEvent) => {
    e.stopPropagation();
    setActiveMenu(activeMenu() === id ? null : id);
  };

  const executeAction = (action?: () => void) => {
    setActiveMenu(null);
    if (action) action();
  };

  const menus: MenuDef[] = [
    {
      id: 'file', label: 'File', getItems: () => {
        const events = store.events;
        return [
          { label: "New", action: () => console.log("New document") },
          { label: "Open", action: () => console.log("Open document") },
          { separator: true, label: "" },
          { label: "Import DOCX...", action: () => document.getElementById("oasis-editor-import-docx-input")?.click() },
          { label: "Export DOCX...", action: () => events?.onExportDocx?.() },
          { label: "Export PDF...", action: () => events?.onExportPdf?.() },
          { label: "Download", action: () => console.log("Download") },
          { separator: true, label: "" },
          { label: "Print", shortcut: "Ctrl+P", action: () => (events?.onPrint ? events.onPrint() : window.print()) },
        ];
      }
    },
    {
      id: 'edit', label: 'Edit', getItems: () => {
        const events = store.events;
        return [
          { label: "Undo", shortcut: "Ctrl+Z", action: () => events?.onUndo() },
          { label: "Redo", shortcut: "Ctrl+Y", action: () => events?.onRedo() },
          { separator: true, label: "" },
          { label: "Cut", shortcut: "Ctrl+X", action: () => document.execCommand("cut") },
          { label: "Copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy") },
          { label: "Paste", shortcut: "Ctrl+V", action: () => document.execCommand("paste") },
        ];
      }
    },
    {
      id: 'insert', label: 'Insert', getItems: () => {
        const events = store.events;
        return [
          { label: "Image", action: () => document.getElementById("oasis-editor-image-input")?.click() },
          { label: "Page break", action: () => events?.onInsertPageBreak?.() },
          { separator: true, label: "" },
          { label: "Footnote", action: () => events?.onInsertFootnote?.() },
          { label: "Endnote", action: () => events?.onInsertEndnote?.() },
          { label: "Page number", action: () => events?.onInsertPageNumber?.() },
          { separator: true, label: "" },
          { label: "Horizontal line", action: () => console.log("Insert HR") },
        ];
      }
    },
    {
      id: 'format', label: 'Format', getItems: () => {
        const events = store.events;
        return [
          { label: "Bold", shortcut: "Ctrl+B", action: () => events?.onBold() },
          { label: "Italic", shortcut: "Ctrl+I", action: () => events?.onItalic() },
          { label: "Underline", shortcut: "Ctrl+U", action: () => events?.onUnderline() },
          { separator: true, label: "" },
          { label: "Align Left", action: () => events?.onAlign("left") },
          { label: "Align Center", action: () => events?.onAlign("center") },
          { label: "Align Right", action: () => events?.onAlign("right") },
          { label: "Justify", action: () => events?.onAlign("justify") },
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
