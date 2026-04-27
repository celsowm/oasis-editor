import { Component, Show, For, createSignal } from 'solid-js';
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, ToolbarSelect } from './components/Toolbar.tsx';
import { MenuBar } from './components/MenuBar.tsx';
import { store, setStore } from './EditorStore.tsx';
import { sanitizeUrl } from '../core/utils/sanitizeUrl.js';
import { ColorPickerComponent } from './components/ColorPicker.tsx';
import { HighlightColorPickerComponent } from './components/HighlightColorPicker.js';
import { TablePickerInline } from './components/TablePicker.tsx';
import { RulerComponent } from './ruler/Ruler.tsx';
import { SelectionLayer } from './selection/SelectionLayer.tsx';
import { PageLayerComponent } from './pages/PageLayer.tsx';
import { TableToolbar } from './selection/TableToolbar.tsx';
import { II18nService } from '../core/utils/I18nService.js';
import { I18nProvider, useI18n } from './I18nContext.tsx';

interface Props {
  i18n: II18nService;
}

const OasisEditorContent: Component = () => {
  const { t, locale, setLocale } = useI18n();
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
            const url = prompt(t("messages", "enterLink"));
            if (url) {
              const sanitized = sanitizeUrl(url);
              if (sanitized) events.onInsertLink(sanitized);
            }
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
            <input type="text" class="oasis-editor-document-title" value={t("messages", "untitled")} />
            <MenuBar />
            <div class="oasis-editor-i18n-switch" style={{ display: 'flex', gap: '4px', "margin-left": 'auto', "font-size": '10px' }}>
                <button 
                  onClick={() => setLocale("en-US")}
                  style={{ "font-weight": locale() === "en-US" ? "bold" : "normal" }}
                >EN</button>
                <button 
                  onClick={() => setLocale("pt-BR")}
                  style={{ "font-weight": locale() === "pt-BR" ? "bold" : "normal" }}
                >PT</button>
            </div>
          </div>
        </div>
      </header>

      <Toolbar mode="overflow" onClick={handleToolbarClick} onMouseDown={handleToolbarMouseDown}>
        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-undo" icon="undo" command="undo" title={t("toolbar", "undo")} />
          <ToolbarButton id="oasis-editor-redo" icon="redo" command="redo" title={t("toolbar", "redo")} />
          <ToolbarButton id="oasis-editor-print" icon="printer" command="print" title={t("toolbar", "print")} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-format-painter" icon="paintbrush" command="format-painter" title={t("toolbar", "formatPainter")} class="oasis-editor-toolbar-btn" />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarSelect id="oasis-editor-font-family" title={t("toolbar", "fontFamily")} value={ss()?.fontFamily || 'Inter'} onChange={(e: any) => store.events?.onFontFamilyChange(e.target.value)}>
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
          </ToolbarSelect>
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-bold" icon="bold" command="bold" active={ss()?.bold} title={t("toolbar", "bold")} />
          <ToolbarButton id="oasis-editor-italic" icon="italic" command="italic" active={ss()?.italic} title={t("toolbar", "italic")} />
          <ToolbarButton id="oasis-editor-underline" icon="underline" command="underline" active={ss()?.underline} title={t("toolbar", "underline")} />
          <ToolbarButton id="oasis-editor-strikethrough" icon="strikethrough" command="strikethrough" active={ss()?.strike} title={t("toolbar", "strike")} />
          <ToolbarButton id="oasis-editor-superscript" icon="superscript" command="superscript" active={ss()?.vertAlign === 'superscript'} title={t("toolbar", "superscript")} />
          <ToolbarButton id="oasis-editor-subscript" icon="subscript" command="subscript" active={ss()?.vertAlign === 'subscript'} title={t("toolbar", "subscript")} />
          <ToolbarButton id="oasis-editor-link" icon="link" command="link" active={!!ss()?.link} title={t("toolbar", "link")} />
          <ColorPickerComponent
            onColorSelected={(color) => {
              setStore('pickerColor', color);
              store.events?.onColorChange?.(color);
            }}
            initialColor={store.pickerColor}
          />
          <HighlightColorPickerComponent
            onHighlightSelected={(color) => {
              setStore('pickerHighlightColor', color);
              store.events?.onHighlightChange?.(color);
            }}
            initialColor={store.pickerHighlightColor}
          />
          <ToolbarButton id="oasis-editor-track-changes" icon="eye" command="track-changes" active={ss()?.trackChangesEnabled} title={t("toolbar", "trackChanges")} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-align-left" icon="align-left" command="align:left" active={ss()?.align === 'left'} title={t("toolbar", "alignLeft")} />
          <ToolbarButton id="oasis-editor-align-center" icon="align-center" command="align:center" active={ss()?.align === 'center'} title={t("toolbar", "alignCenter")} />
          <ToolbarButton id="oasis-editor-align-right" icon="align-right" command="align:right" active={ss()?.align === 'right'} title={t("toolbar", "alignRight")} />
          <ToolbarButton id="oasis-editor-align-justify" icon="align-justify" command="align:justify" active={ss()?.align === 'justify'} title={t("toolbar", "alignJustify")} />
          <ToolbarButton id="oasis-editor-bullets" icon="list" command="bullets" active={ss()?.isListItem} title={t("toolbar", "bullets")} />
          <ToolbarButton id="oasis-editor-ordered-list" icon="list-ordered" command="ordered-list" active={ss()?.isOrderedListItem} title={t("toolbar", "orderedList")} />
          <ToolbarButton id="oasis-editor-decrease-indent" icon="outdent" command="decrease-indent" title={t("toolbar", "decreaseIndent")} />
          <ToolbarButton id="oasis-editor-increase-indent" icon="indent" command="increase-indent" title={t("toolbar", "increaseIndent")} />
        </ToolbarGroup>

        <ToolbarSeparator />

        <ToolbarGroup>
          <ToolbarButton id="oasis-editor-insert-image" icon="image" title={t("toolbar", "insertImage")} onClick={() => document.getElementById("oasis-editor-image-input")?.click()} />
          <input type="file" id="oasis-editor-image-input" accept="image/*" style={{ display: 'none' }} />
          <TablePickerInline
            onTableSelected={(rows, cols) => {
              setStore('pickerTableRows', rows);
              setStore('pickerTableCols', cols);
              store.events?.onTableInsert?.(rows, cols);
            }}
          />
        </ToolbarGroup>
      </Toolbar>

      <main id="oasis-editor-app" class="oasis-editor-main">
        <RulerComponent
          template={store.view?.pageTemplate ?? null}
          initialIndentation={store.view?.selectionState?.indentation ?? 0}
          onIndentationChange={(val) => store.events?.onIndentationChange?.(val)}
        />
        <section id="oasis-editor-pages" class="oasis-editor-pages">
          <PageLayerComponent layout={store.pageLayout} editingMode={store.editingMode} />
        </section>
        <SelectionLayer />
        <TableToolbar
          onInsertRowAbove={() => store.events?.onInsertRowAbove?.()}
          onInsertRowBelow={() => store.events?.onInsertRowBelow?.()}
          onInsertColumnLeft={() => store.events?.onInsertColumnLeft?.()}
          onInsertColumnRight={() => store.events?.onInsertColumnRight?.()}
          onDeleteRow={() => store.events?.onDeleteRow?.()}
          onDeleteColumn={() => store.events?.onDeleteColumn?.()}
          onDeleteTable={() => store.events?.onDeleteTable?.()}
        />
      </main>

      <footer class="oasis-editor-footer-status">
        <span id="oasis-editor-status">{store.view?.status}</span>
        <span id="oasis-editor-metrics">
            <Show when={store.view?.metrics}>
                {m => t("messages", "pageInfo", 1, m().pages)}
            </Show>
        </span>
      </footer>
    </div>
  );
};

const OasisEditor: Component<Props> = (props) => {
  return (
    <I18nProvider service={props.i18n}>
      <OasisEditorContent />
    </I18nProvider>
  );
};

export default OasisEditor;
