import { describe, it, expect, beforeEach } from "vitest";
import { OasisEditorDom } from "../../app/dom/OasisEditorDom.js";
import { OasisEditorView } from "../../app/OasisEditorView.js";
import { OasisEditorController } from "../../app/OasisEditorController.js";
import { DragStateService } from "../../app/services/DragStateService.js";
import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";

describe("OasisEditor Integration", () => {
  let shell: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = `
      <div class="oasis-editor-shell">
        <div id="oasis-editor-app"></div>
        <div id="oasis-editor-pages"></div>
        <div id="oasis-editor-ruler"></div>
        <select id="oasis-editor-template"></select>
        <select id="oasis-editor-font-family"></select>
        <div id="oasis-editor-format-painter"></div>
        <div id="oasis-editor-bold"></div>
        <div id="oasis-editor-italic"></div>
        <div id="oasis-editor-underline"></div>
        <div id="oasis-editor-strikethrough"></div>
        <div id="oasis-editor-superscript"></div>
        <div id="oasis-editor-subscript"></div>
        <div id="oasis-editor-link"></div>
        <div id="oasis-editor-track-changes"></div>
        <select id="oasis-editor-style-select"></select>
        <div id="oasis-editor-color-picker-container"></div>
        <div id="oasis-editor-align-left"></div>
        <div id="oasis-editor-align-center"></div>
        <div id="oasis-editor-align-right"></div>
        <div id="oasis-editor-align-justify"></div>
        <div id="oasis-editor-bullets"></div>
        <div id="oasis-editor-ordered-list"></div>
        <div id="oasis-editor-decrease-indent"></div>
        <div id="oasis-editor-increase-indent"></div>
        <div id="oasis-editor-undo"></div>
        <div id="oasis-editor-redo"></div>
        <div id="oasis-editor-print"></div>
        <div id="oasis-editor-export"></div>
        <div id="oasis-editor-insert-image"></div>
        <input id="oasis-editor-image-input" type="file" />
        <div id="oasis-editor-menu-file"></div>
        <div id="oasis-editor-menu-edit"></div>
        <div id="oasis-editor-menu-view"></div>
        <div id="oasis-editor-menu-insert"></div>
        <div id="oasis-editor-menu-format"></div>
        <div id="oasis-editor-menu-tools"></div>
        <div id="oasis-editor-menu-extensions"></div>
        <div id="oasis-editor-menu-help"></div>
        <select id="oasis-editor-zoom"></select>
        <input id="oasis-editor-import-docx-input" type="file" />
        <div id="oasis-editor-insert-table"></div>
        <div id="oasis-editor-status"></div>
        <div id="oasis-editor-metrics"></div>
        <input id="oasis-editor-input" />
        <div id="oasis-editor-color-picker-container"></div>
        <div id="oasis-editor-table-picker-container"></div>
      </div>
    `;
    shell = document.querySelector(".oasis-editor-shell")!;
  });

  it("should instantiate and start without throwing", () => {
    const dom = new OasisEditorDom(shell);
    const presenter = { 
        getTemplateOptions: () => [],
        getTemplateOptionsViewModel: () => [],
        present: () => ({ 
            layout: { pages: [] }, 
            selection: null, 
            editingMode: 'main',
            templateId: 'default',
            status: '',
            metrics: { revision: 0, pages: 0 },
            selectionState: {}
        }),
        getSelectionState: () => ({})
    } as any;
    const measurer = { measureText: () => ({ width: 0, height: 0 }) } as any;

    const view = new OasisEditorView({
      dom,
      presenter,
      measurer,
      colorPickerFactory: () => ({ setCurrentColor: () => {} }) as any,
      tablePickerFactory: () => ({}) as any,
      tableToolbarFactory: () => ({ hide: () => {} }) as any,
      tableMoveHandleFactory: () => ({ hide: () => {} }) as any,
      imageResizeOverlayFactory: () => ({}) as any,
    });

    const controller = new OasisEditorController({
      runtime: new DocumentRuntime(),
      layoutService: {
        updateLayout: () => ({ pages: [], fragmentsByBlockId: {} }),
        compose: () => ({ pages: [], fragmentsByBlockId: {} })
      } as any,
      presenter: presenter,
      view: view,
      measurementService: {} as any,
      importer: {} as any,
      exporter: {} as any,
      pdfExporter: {} as any,
      domHitTester: {} as any,
      fontManager: { getAvailableFonts: () => [] } as any,
      dragState: new DragStateService(),
    });

    expect(() => {
      controller.start();
    }).not.toThrow();
  });
});
