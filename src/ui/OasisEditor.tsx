import { onMount, Component, Show, For } from 'solid-js';
import { createIcons, icons } from 'lucide';
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, ToolbarSelect } from './components/Toolbar.tsx';
import { MenuBar } from './components/MenuBar.tsx';
import { store } from './EditorStore.tsx';

const OasisEditor: Component = () => {
  onMount(() => {
    createIcons({ icons, nameAttr: "data-lucide" });
  });

  const ss = () => store.view?.selectionState;

  const handleToolbarClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest("button[data-command]") as HTMLElement;
    if (!btn) return;
    const commandStr = btn.getAttribute("data-command");
    if (!commandStr) return;
    const [cmd, arg] = commandStr.split(":");
    const events = store.events;
    if (!events) return;

    switch (cmd) {
        case "bold": events.onBold(); break;
        case "italic": events.onItalic(); break;
        case "underline": events.onUnderline(); break;
        case "strikethrough": events.onStrikethrough(); break;
        case "superscript": events.onSuperscript(); break;
        case "subscript": events.onSubscript(); break;
        case "undo": events.onUndo(); break;
        case "redo": events.onRedo(); break;
        case "print": events.onPrint?.() || window.print(); break;
        case "format-painter": events.onFormatPainterToggle(); break;
        case "align": events.onAlign(arg as any); break;
        case "bullets": events.onToggleBullets(); break;
        case "ordered-list": events.onToggleNumberedList(); break;
        case "decrease-indent": events.onDecreaseIndent(); break;
        case "increase-indent": events.onIncreaseIndent(); break;
        case "track-changes": events.onToggleTrackChanges(); break;
        case "link":
            const url = prompt("Enter link URL:");
            if (url) events.onInsertLink(url);
            break;
    }
  };

  const handleToolbarMouseDown = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest("button[data-command]") as HTMLElement;
    if (btn) e.preventDefault(); // Prevent focus loss
  };

  return (
    <div class="oasis-editor-shell">
      <header class="oasis-editor-header">
        <div class="oasis-editor-brand">
          <div class="oasis-editor-logo"></div>
          <div class="oasis-editor-title-container">
            <input type="text" class="oasis-editor-document-title" value="Untitled document" />
            <MenuBar />
            <input type="file" id="oasis-editor-import-docx-input" accept=".docx" style={{ display: 'none' }} />
          </div>
        </div>
      </header>

      <Toolbar mode="overflow" onClick={handleToolbarClick} onMouseDown={handleToolbarMouseDown}>
        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-undo" icon="undo" command="undo" title="Undo (Ctrl+Z)" />
          <ToolbarButton id="oasis-editor-redo" icon="redo" command="redo" title="Redo (Ctrl+Y)" />
          <ToolbarButton id="oasis-editor-print" icon="printer" command="print" title="Print" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-format-painter" icon="paintbrush" command="format-painter" title="Format Painter" class="oasis-editor-toolbar-btn" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarSelect id="oasis-editor-zoom" onChange={(e: any) => {
            const val = e.target.value;
            if (val !== "fit") {
              const scale = parseInt(val) / 100;
              const pagesContainer = document.querySelector(".oasis-editor-pages") as HTMLElement;
              if (pagesContainer) {
                pagesContainer.style.transform = `scale(${scale})`;
                pagesContainer.style.transformOrigin = "top center";
              }
            }
          }}>
            <option value="100%">100%</option>
            <option value="fit">Fit</option>
          </ToolbarSelect>
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarSelect id="oasis-editor-font-family" title="Font family" value={ss()?.fontFamily || 'Inter'} onChange={(e: any) => store.events?.onFontFamilyChange(e.target.value)}>
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
            <option value="Verdana">Verdana</option>
          </ToolbarSelect>
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarSelect id="oasis-editor-template" title="Page Template" value={store.view?.templateId || 'a4'} onChange={(e: any) => store.events?.onTemplateChange(e.target.value)}>
            <For each={store.view?.templateOptions}>
              {(option) => (
                <option value={option.value}>{option.label}</option>
              )}
            </For>
          </ToolbarSelect>
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-bold" icon="bold" command="bold" active={ss()?.bold} title="Bold (Ctrl+B)" />
          <ToolbarButton id="oasis-editor-italic" icon="italic" command="italic" active={ss()?.italic} title="Italic (Ctrl+I)" />
          <ToolbarButton id="oasis-editor-underline" icon="underline" command="underline" active={ss()?.underline} title="Underline (Ctrl+U)" />
          <ToolbarButton id="oasis-editor-strikethrough" icon="strikethrough" command="strikethrough" active={ss()?.strike} title="Strikethrough" />
          <ToolbarButton id="oasis-editor-superscript" icon="superscript" command="superscript" active={ss()?.vertAlign === 'superscript'} title="Superscript" />
          <ToolbarButton id="oasis-editor-subscript" icon="subscript" command="subscript" active={ss()?.vertAlign === 'subscript'} title="Subscript" />
          <ToolbarButton id="oasis-editor-link" icon="link" command="link" active={!!ss()?.link} title="Insert Link" />
          <div id="oasis-editor-color-picker-container"></div>
          <ToolbarButton id="oasis-editor-track-changes" icon="eye" command="track-changes" active={ss()?.trackChangesEnabled} title="Track Changes" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarSelect id="oasis-editor-style-select" title="Paragraph style" onChange={(e: any) => store.events?.onStyleChange?.(e.target.value)}>
            <option value="">Normal</option>
            <option value="Heading1">Heading 1</option>
            <option value="Heading2">Heading 2</option>
            <option value="Heading3">Heading 3</option>
            <option value="Heading4">Heading 4</option>
            <option value="Heading5">Heading 5</option>
            <option value="Heading6">Heading 6</option>
          </ToolbarSelect>
        </ToolbarGroup>

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-align-left" icon="align-left" command="align:left" active={ss()?.align === 'left'} title="Align left" />
          <ToolbarButton id="oasis-editor-align-center" icon="align-center" command="align:center" active={ss()?.align === 'center'} title="Align center" />
          <ToolbarButton id="oasis-editor-align-right" icon="align-right" command="align:right" active={ss()?.align === 'right'} title="Align right" />
          <ToolbarButton id="oasis-editor-align-justify" icon="align-justify" command="align:justify" active={ss()?.align === 'justify'} title="Justify" />
          <ToolbarButton id="oasis-editor-bullets" icon="list" command="bullets" active={ss()?.isListItem} title="Bulleted list" />
          <ToolbarButton id="oasis-editor-ordered-list" icon="list-ordered" command="ordered-list" active={ss()?.isOrderedListItem} title="Numbered list" />
          <ToolbarButton id="oasis-editor-decrease-indent" icon="outdent" command="decrease-indent" title="Decrease indent" />
          <ToolbarButton id="oasis-editor-increase-indent" icon="indent" command="increase-indent" title="Increase indent" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-insert-image" icon="image" title="Insert Image" onClick={() => document.getElementById("oasis-editor-image-input")?.click()} />
          <input type="file" id="oasis-editor-image-input" accept="image/*" style={{ display: 'none' }} />
          <ToolbarButton id="oasis-editor-insert-table" icon="table" title="Insert Table" />
          <div id="oasis-editor-table-picker-container"></div>
        </ToolbarGroup>
      </Toolbar>

      <main id="oasis-editor-app" class="oasis-editor-main">
        <div id="oasis-editor-ruler"></div>
        <section id="oasis-editor-pages" class="oasis-editor-pages"></section>
      </main>

      <div id="oasis-editor-input-container" style={{ position: 'fixed', left: '-1000px', top: '-1000px', width: '1px', height: '1px', overflow: 'hidden' }}>
        <textarea id="oasis-editor-input"></textarea>
      </div>

      <footer class="oasis-editor-footer-status">
        <span id="oasis-editor-status">{store.view?.status}</span>
        <span id="oasis-editor-metrics">
            <Show when={store.view?.metrics}>
                {m => `Revision ${m().revision} • ${m().pages} pages`}
            </Show>
        </span>
      </footer>
    </div>
  );
};

export default OasisEditor;
