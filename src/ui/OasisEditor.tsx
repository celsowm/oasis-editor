import { Component, Show, For, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { Toolbar, ToolbarButton, ToolbarGroup, ToolbarSeparator, ToolbarSelect } from './components/Toolbar.tsx';
import { MenuBar } from './components/MenuBar.tsx';
import { store, setStore } from './EditorStore.tsx';
import { sanitizeUrl } from '../core/utils/sanitizeUrl.js';
import { ColorPickerComponent } from './components/ColorPicker.tsx';
import { HighlightColorPickerComponent } from './components/HighlightColorPicker.js';
import { TablePickerInline } from './components/TablePicker.tsx';
import { RulerComponent } from './ruler/Ruler.tsx';
import { PageLayerComponent } from './pages/PageLayer.tsx';
import { TableToolbar } from './selection/TableToolbar.tsx';
import { II18nService } from '../core/utils/I18nService.js';
import { I18nProvider, useI18n } from './I18nContext.tsx';
import { Logger } from '../core/utils/Logger.js';

interface Props {
  i18n: II18nService;
}

const OasisEditorContent: Component = () => {
  const { t, locale, setLocale } = useI18n();
  const ss = () => store.view?.selectionState;
  const TEMP_DISABLE_FORMATTING = true;

  createEffect(() => {
    Logger.debug("OASIS: reactive snapshot", {
      hasPageLayout: !!store.pageLayout,
      pageCount: store.pageLayout?.pages.length ?? 0,
      editingMode: store.editingMode,
      revision: store.view?.metrics?.revision ?? null,
    });
  });

  onMount(() => {
    const logKey = (label: string) => (e: KeyboardEvent) => {
      Logger.debug(`OASIS: ${label}`, {
        key: e.key,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        hasFocus: document.hasFocus(),
        activeElement: document.activeElement
          ? {
              tag: document.activeElement.tagName,
              id: (document.activeElement as HTMLElement).id ?? null,
              className: (document.activeElement as HTMLElement).className ?? null,
            }
          : null,
      });
    };

    const windowKeydown = logKey("window keydown");
    const windowKeyup = logKey("window keyup");
    window.addEventListener("keydown", windowKeydown, true);
    window.addEventListener("keyup", windowKeyup, true);
    onCleanup(() => {
      window.removeEventListener("keydown", windowKeydown, true);
      window.removeEventListener("keyup", windowKeyup, true);
    });
  });

  const isFormattingCommand = (cmd: string) =>
    [
      "bold",
      "italic",
      "underline",
      "strikethrough",
      "superscript",
      "subscript",
      "format-painter",
      "align",
      "bullets",
      "ordered-list",
      "decrease-indent",
      "increase-indent",
      "link",
      "font-family",
      "color",
      "highlight",
      "style",
      "track-changes",
    ].includes(cmd);

  const handleToolbarClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest("button[data-command]") as HTMLElement;
    if (!btn) return;
    const commandStr = btn.getAttribute("data-command");
    if (!commandStr) return;
    const [cmd, arg] = commandStr.split(":");
    const events = store.events;
    if (!events) return;

    if (TEMP_DISABLE_FORMATTING && isFormattingCommand(cmd)) {
      return;
    }

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

  const isEditableTarget = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    return !!el.closest("input, textarea, select, [contenteditable='true']");
  };

  const handleEditorMouseDown = (e: MouseEvent) => {
    if (isEditableTarget(e.target)) return;
    Logger.debug("OASIS: editor mousedown", {
      hasFocus: document.hasFocus(),
      activeElement: document.activeElement
        ? {
            tag: document.activeElement.tagName,
            id: (document.activeElement as HTMLElement).id ?? null,
            className: (document.activeElement as HTMLElement).className ?? null,
          }
        : null,
    });
    document.getElementById("oasis-editor-input")?.focus();
  };

  const handleEditorKeyDown = (e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return;
    const events = store.events;
    if (!events) return;

    Logger.debug("OASIS: editor keydown", {
      key: e.key,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      hasFocus: document.hasFocus(),
      activeElement: document.activeElement
        ? {
            tag: document.activeElement.tagName,
            id: (document.activeElement as HTMLElement).id ?? null,
            className: (document.activeElement as HTMLElement).className ?? null,
          }
        : null,
    });

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !e.isComposing) {
      events.onTextInput(e.key);
      e.preventDefault();
      return;
    }

    if (e.key === "Backspace") {
      events.onDelete();
      e.preventDefault();
    } else if (e.key === "Enter") {
      events.onEnter(e.shiftKey);
      e.preventDefault();
    } else if (e.key === "Tab") {
      if (e.shiftKey) events.onDecreaseIndent();
      else events.onIncreaseIndent();
      e.preventDefault();
    } else if (e.key === "Escape") {
      events.onEscape();
      e.preventDefault();
    } else if (e.key.startsWith("Arrow") || e.key === "Home" || e.key === "End") {
      events.onArrowKey(e.key);
      e.preventDefault();
    } else if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (TEMP_DISABLE_FORMATTING && (key === "b" || key === "i" || key === "u")) {
        e.preventDefault();
        return;
      }
      if (key === "b") {
        events.onBold();
        e.preventDefault();
      } else if (key === "i") {
        events.onItalic();
        e.preventDefault();
      } else if (key === "u") {
        events.onUnderline();
        e.preventDefault();
      } else if (key === "z") {
        events.onUndo();
        e.preventDefault();
      } else if (key === "y") {
        events.onRedo();
        e.preventDefault();
      }
    }
  };

  return (
    <div class="oasis-editor-shell">
      <header class="oasis-editor-header">
        <div class="oasis-editor-brand">
          <div class="oasis-editor-logo"></div>
          <div class="oasis-editor-title-container" style={{ flex: 1 }}>
            <div style={{ display: 'flex', 'align-items': 'center', gap: '8px' }}>
              <input type="text" class="oasis-editor-document-title" value={t("messages", "untitled")} />
              <div class="oasis-editor-i18n-switch" style={{ display: 'flex', gap: '4px', "margin-left": 'auto' }}>
                  <button 
                    onClick={() => setLocale("en-US")}
                    class={locale() === "en-US" ? "active" : ""}
                    style={{ "font-size": '10px', padding: '2px 6px', border: '1px solid #dadce0', 'border-radius': '4px', cursor: 'pointer', background: locale() === "en-US" ? '#e8f0fe' : 'white' }}
                  >EN</button>
                  <button 
                    onClick={() => setLocale("pt-BR")}
                    class={locale() === "pt-BR" ? "active" : ""}
                    style={{ "font-size": '10px', padding: '2px 6px', border: '1px solid #dadce0', 'border-radius': '4px', cursor: 'pointer', background: locale() === "pt-BR" ? '#e8f0fe' : 'white' }}
                  >PT</button>
              </div>
            </div>
            <MenuBar />
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
          <ToolbarSelect id="oasis-editor-template" title={t("toolbar", "pageTemplate")} value={store.view?.pageTemplate?.name || 'A4'} onChange={(e: any) => store.events?.onTemplateChange(e.target.value)}>
            <option value="A4">A4</option>
            <option value="Letter">Letter</option>
            <option value="Legal">Legal</option>
          </ToolbarSelect>
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
              if (TEMP_DISABLE_FORMATTING) return;
              setStore('pickerColor', color);
              store.events?.onColorChange?.(color);
            }}
            initialColor={store.pickerColor}
          />
          <HighlightColorPickerComponent
            onHighlightSelected={(color) => {
              if (TEMP_DISABLE_FORMATTING) return;
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

      {/* Hidden inputs for legacy View compatibility */}
      <textarea
        id="oasis-editor-input"
        aria-hidden="true"
        tabIndex={-1}
        style={{ position: 'fixed', top: '-100px', left: '-100px', opacity: 0, width: '1px', height: '1px' }}
      ></textarea>
      <input type="file" id="oasis-editor-import-docx-input" accept=".docx" style={{ display: 'none' }} />

      <main
        id="oasis-editor-app"
        class="oasis-editor-main"
        tabIndex={0}
        onMouseDown={handleEditorMouseDown}
        onFocus={() => Logger.debug("OASIS: editor focus", {
          hasFocus: document.hasFocus(),
          activeElement: document.activeElement
            ? {
                tag: document.activeElement.tagName,
                id: (document.activeElement as HTMLElement).id ?? null,
                className: (document.activeElement as HTMLElement).className ?? null,
              }
            : null,
        })}
        onBlur={() => Logger.debug("OASIS: editor blur", {
          hasFocus: document.hasFocus(),
          activeElement: document.activeElement
            ? {
                tag: document.activeElement.tagName,
                id: (document.activeElement as HTMLElement).id ?? null,
                className: (document.activeElement as HTMLElement).className ?? null,
              }
            : null,
        })}
        onKeyDown={handleEditorKeyDown}
        onKeyUp={(e) => Logger.debug("OASIS: editor keyup", {
          key: e.key,
          hasFocus: document.hasFocus(),
          activeElement: document.activeElement
            ? {
                tag: document.activeElement.tagName,
                id: (document.activeElement as HTMLElement).id ?? null,
                className: (document.activeElement as HTMLElement).className ?? null,
              }
            : null,
        })}
      >
        <RulerComponent
          template={store.view?.pageTemplate ?? null}
          initialIndentation={store.view?.selectionState?.indentation ?? 0}
          onIndentationChange={(val) => store.events?.onIndentationChange?.(val)}
        />
        <section id="oasis-editor-pages" class="oasis-editor-pages">
          <PageLayerComponent layout={store.pageLayout} editingMode={store.editingMode} />
        </section>
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
