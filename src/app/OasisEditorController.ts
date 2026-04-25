import { Operations } from "../core/operations/OperationFactory.js";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { DocumentLayoutService } from "./services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "./OasisEditorView.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { LogicalPosition } from "../core/selection/SelectionTypes.js";
import { PositionCalculator } from "./services/PositionCalculator.js";
import { isTextBlock, BlockNode } from "../core/document/BlockTypes.js";
import { getAllBlocks } from "../core/document/BlockUtils.js";
import { TextMeasurementService } from "./services/TextMeasurementService.js";
import { DocumentImporter } from "../core/import/DocumentImporter.js";
import { PAGE_TEMPLATES } from "../core/pages/PageTemplateFactory.js";
import { FormatPainterController } from "./controllers/FormatPainterController.js";
import { CursorPositionCalculator } from "./services/CursorPositionCalculator.js";
import { TableDragController } from "./controllers/TableDragController.js";

export interface ControllerDeps {
  runtime: DocumentRuntime;
  layoutService: DocumentLayoutService;
  presenter: OasisEditorPresenter;
  view: OasisEditorView;
  measurementService: TextMeasurementService;
  importer: DocumentImporter;
}

export class OasisEditorController {
  private runtime: DocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private measurementService: TextMeasurementService;
  private importer: DocumentImporter;
  private latestLayout: LayoutState | null;
  private isDragging: boolean;
  private dragAnchor: LogicalPosition | null;
  private positionCalculator: PositionCalculator | null;
  private cursorCalc: CursorPositionCalculator;
  private tableDrag: TableDragController;

  // Format Painter
  private formatPainter: FormatPainterController;

  constructor({
    runtime,
    layoutService,
    presenter,
    view,
    measurementService,
    importer,
  }: ControllerDeps) {
    this.runtime = runtime;
    this.layoutService = layoutService;
    this.presenter = presenter;
    this.view = view;
    this.measurementService = measurementService;
    this.importer = importer;
    this.latestLayout = null;
    this.isDragging = false;
    this.dragAnchor = null;
    this.positionCalculator = null;
    this.formatPainter = new FormatPainterController(this.runtime, this.presenter, this.view, () => this.latestLayout!);
    this.cursorCalc = new CursorPositionCalculator(
      this.measurementService,
      () => this.latestLayout,
      () => getAllBlocks(this.runtime.getState().document),
    );
    this.tableDrag = new TableDragController(this.runtime, this.view, () => this.latestLayout);
  }

  start(): void {
    this.view.renderTemplateOptions(this.presenter.getTemplateOptions());
    this.view.bind({
      onFormatPainterToggle: () => this.toggleFormatPainter(),
      onFormatPainterDoubleClick: () => this.toggleFormatPainter(true),
      onBold: () => this.toggleBold(),
      onItalic: () => this.toggleItalic(),
      onUnderline: () => this.toggleUnderline(),
      onColorChange: (color) => this.setColor(color),
      onUndo: () => this.undo(),
      onRedo: () => this.redo(),
      onTemplateChange: (templateId) => this.setTemplate(templateId),
      onTextInput: (text) => this.insertText(text),
      onDelete: () => this.deleteText(),
      onEnter: (isShift) =>
        isShift ? this.insertText("\n") : this.insertParagraph(),
      onEscape: () => {
        const state = this.runtime.getState();
        if (state.editingMode !== "main") {
          this.runtime.dispatch(Operations.setEditingMode("main"));
        }
      },
      onArrowKey: (key) => this.moveCaret(key),
      onMouseDown: (e) => this.handleMouseDown(e),
      onMouseMove: (e) => this.handleMouseMove(e),
      onMouseUp: () => this.handleMouseUp(),
      onDblClick: (e) => this.handleDblClick(e),
      onTripleClick: (e) => this.handleTripleClick(e),
      onAlign: (align) => this.setAlign(align),
      onToggleBullets: () => this.toggleBullets(),
      onToggleNumberedList: () => this.toggleNumberedList(),
      onDecreaseIndent: () => this.decreaseIndent(),
      onIncreaseIndent: () => this.increaseIndent(),
      onInsertImage: (src, nw, nh, dw) => this.insertImage(src, nw, nh, dw),
      onImportDocx: (file) => this.importDocx(file),
      onResizeImage: (blockId, w, h) => this.resizeImage(blockId, w, h),
      onSelectImage: (blockId) => this.selectImage(blockId),
      onInsertTable: (rows, cols) => this.insertTable(rows, cols),
      onTableAction: (action, tableId) =>
        this.handleTableAction(action, tableId),
      onTableMove: (tableId, targetBlockId, isBefore) => {
        this.runtime.dispatch(
          Operations.moveBlock(tableId, targetBlockId, isBefore),
        );
      },
      onPrint: () => window.print(),
    });

    this.view.elements.root.addEventListener("table-drag-start", ((e: CustomEvent) => {
      this.tableDrag.handleDragStart(e.detail.tableId, e.detail.originalEvent);
    }) as EventListener);

    window.addEventListener("mousemove", (e) => {
      if (this.tableDrag.isDraggingTable) this.tableDrag.handleDragging(e);
    });

    window.addEventListener("mouseup", (e) => {
      if (this.tableDrag.isDraggingTable) this.tableDrag.handleMouseUp(e);
    });

    this.isDragging = false;
    this.dragAnchor = null;

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  toggleFormatPainter(isDoubleClick: boolean = false): void {
    this.formatPainter.toggle(isDoubleClick);
  }

  toggleBold(): void {
    this.runtime.dispatch(Operations.toggleMark("bold"));
  }

  toggleItalic(): void {
    this.runtime.dispatch(Operations.toggleMark("italic"));
  }

  toggleUnderline(): void {
    this.runtime.dispatch(Operations.toggleMark("underline"));
  }

  setColor(color: string): void {
    this.runtime.dispatch(Operations.setMark("color", color));
  }

  async importDocx(file: File): Promise<void> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const docModel = await this.importer.importFromBuffer(arrayBuffer);

      const firstSection = docModel.sections[0];
      const firstBlock = firstSection?.children[0];
      const firstInlineId =
        firstBlock && isTextBlock(firstBlock) ? firstBlock.children[0]?.id : "";

      this.runtime.setState({
        document: docModel,
        selection: firstBlock
          ? {
              anchor: {
                sectionId: firstSection.id,
                blockId: firstBlock.id,
                inlineId: firstInlineId,
                offset: 0,
              },
              focus: {
                sectionId: firstSection.id,
                blockId: firstBlock.id,
                inlineId: firstInlineId,
                offset: 0,
              },
            }
          : null,
        editingMode: "main",
      });
    } catch (e) {
      console.error("Failed to import DOCX:", e);
    }
  }

  insertImage(
    src: string,
    naturalWidth: number,
    naturalHeight: number,
    displayWidth: number,
  ): void {
    this.runtime.dispatch(
      Operations.insertImage(src, naturalWidth, naturalHeight, displayWidth),
    );
  }

  resizeImage(blockId: string, width: number, height: number): void {
    this.runtime.dispatch(Operations.resizeImage(blockId, width, height));
  }

  selectImage(blockId: string): void {
    this.runtime.dispatch(Operations.selectImage(blockId));
  }

  insertTable(rows: number, cols: number): void {
    this.runtime.dispatch(Operations.insertTable(rows, cols));
  }

  handleTableAction(action: string, tableId: string): void {
    const selection = this.runtime.getState().selection;
    if (!selection) return;

    switch (action) {
      case "addRowAbove":
        this.runtime.dispatch(
          Operations.tableAddRowAbove(tableId, selection.anchor.blockId),
        );
        break;
      case "addRowBelow":
        this.runtime.dispatch(
          Operations.tableAddRowBelow(tableId, selection.anchor.blockId),
        );
        break;
      case "addColumnLeft":
        this.runtime.dispatch(
          Operations.tableAddColumnLeft(tableId, selection.anchor.blockId),
        );
        break;
      case "addColumnRight":
        this.runtime.dispatch(
          Operations.tableAddColumnRight(tableId, selection.anchor.blockId),
        );
        break;
      case "deleteRow":
        this.runtime.dispatch(
          Operations.tableDeleteRow(tableId, selection.anchor.blockId),
        );
        break;
      case "deleteColumn":
        this.runtime.dispatch(
          Operations.tableDeleteColumn(tableId, selection.anchor.blockId),
        );
        break;
      case "deleteTable":
        this.runtime.dispatch(Operations.tableDelete(tableId));
        break;
    }
  }

  undo(): void {
    this.runtime.undo();
  }

  redo(): void {
    this.runtime.redo();
  }

  insertText(text: string): void {
    if (!text) return;
    console.log("=== insertText chamado ===", text);
    console.log("Estado atual selection:", this.runtime.getState().selection);

    const stateBefore = this.runtime.getState();
    const selectionBefore = stateBefore.selection?.anchor;
    console.log(
      "🔍 DEBUG: blockId:",
      selectionBefore?.blockId,
      "inlineId:",
      selectionBefore?.inlineId,
    );

    const blockBefore = getAllBlocks(stateBefore.document)
      .find((b) => b.id === selectionBefore?.blockId);

    const runs =
      blockBefore && isTextBlock(blockBefore) ? blockBefore.children : [];
    console.log(
      "🔍 DEBUG: Block encontrado?",
      blockBefore?.id,
      "Runs:",
      runs.map((r) => ({
        id: r.id,
        text: r.text.substring(0, 20),
      })),
    );

    const runBefore = runs.find((r) => r.id === selectionBefore?.inlineId);
    console.log(
      "🔍 DEBUG: Run encontrado?",
      runBefore?.id,
      "Text:",
      runBefore?.text,
    );

    this.runtime.dispatch(Operations.insertText(text));
  }

  deleteText(): void {
    console.log("=== deleteText chamado ===");
    this.runtime.dispatch(Operations.deleteText());
  }

  insertParagraph(): void {
    console.log("=== insertParagraph chamado ===");
    this.runtime.dispatch(Operations.insertParagraph());
  }

  moveCaret(key: string): void {
    console.log("=== moveCaret chamado ===", key);
    this.runtime.dispatch(Operations.moveSelection(key));
  }

  setTemplate(templateId: string): void {
    const firstSection = this.runtime.getState().document.sections[0];
    this.runtime.dispatch(
      Operations.setSectionTemplate(firstSection.id, templateId),
    );
  }

  setAlign(align: "left" | "center" | "right" | "justify"): void {
    this.runtime.dispatch(Operations.setAlignment(align));
  }

  toggleBullets(): void {
    this.runtime.dispatch(Operations.toggleUnorderedList());
  }

  toggleNumberedList(): void {
    this.runtime.dispatch(Operations.toggleOrderedList());
  }

  decreaseIndent(): void {
    this.runtime.dispatch(Operations.decreaseIndent());
  }

  increaseIndent(): void {
    this.runtime.dispatch(Operations.increaseIndent());
  }

  handleMouseDown(event: MouseEvent): void {
    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    this.isDragging = true;
    this.dragAnchor = position;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: position, focus: position }),
    );
  }

  handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging || event.buttons !== 1) {
      this.isDragging = false;
      return;
    }

    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    this.runtime.dispatch(
      Operations.setSelection({ anchor: this.dragAnchor!, focus: position }),
    );
  }

  handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;

      // If format painter is active, apply formatting on mouse up
      if (this.formatPainter.shouldApplyOnMouseUp()) {
        this.formatPainter.apply();
      }
    }
  }

  private isPointInRect(x: number, y: number, rect: { x: number; y: number; width: number; height: number }): boolean {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
  }

  /**
   * Selects the whole word under the click position, mirroring Word's double-click behaviour.
   */
  handleDblClick(event: MouseEvent): void {
    event.preventDefault();

    const state = this.runtime.getState();
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const pageEl = element?.closest(".oasis-page") as HTMLElement | null;

    if (pageEl) {
      const pageId = pageEl.dataset.pageId;
      const page = this.latestLayout?.pages.find((p) => p.id === pageId);
      const template = page ? PAGE_TEMPLATES[page.templateId] : null;

      if (page && template) {
        const rect = pageEl.getBoundingClientRect();
        const scale = rect.height / page.rect.height;
        const clickX = (event.clientX - rect.left) / scale;
        const clickY = (event.clientY - rect.top) / scale;

        const { margins } = template;
        const pageHeight = page.rect.height;

        // Find last main fragment Y to detect "below content" clicks as footer intent
        const lastMainFragment = page.fragments[page.fragments.length - 1];
        const lastContentY = lastMainFragment
          ? lastMainFragment.rect.y + lastMainFragment.rect.height
          : margins.top;
        const firstMainFragment = page.fragments[0];
        const firstContentY = firstMainFragment ? firstMainFragment.rect.y : pageHeight - margins.bottom;

        let targetMode: "main" | "header" | "footer" = "main";

        // Header zone: above header rect, above top margin, or above the first main fragment
        const isHeaderZone =
          clickY < margins.top ||
          (page.headerRect && this.isPointInRect(clickX, clickY, page.headerRect)) ||
          clickY < firstContentY - 8;

        // Footer zone: in footer rect, below bottom margin, or below all main content
        const isFooterZone =
          clickY > pageHeight - margins.bottom ||
          (page.footerRect && this.isPointInRect(clickX, clickY, page.footerRect)) ||
          clickY > lastContentY + 8;

        if (isHeaderZone) targetMode = "header";
        else if (isFooterZone) targetMode = "footer";

        if (targetMode !== state.editingMode) {
          const section = state.document.sections.find(s => s.id === page.sectionId);
          if (section) {
            let targetBlock: BlockNode | null = null;
            if (targetMode === "header") targetBlock = section.header?.[0] ?? null;
            else if (targetMode === "footer") targetBlock = section.footer?.[0] ?? null;
            else targetBlock = section.children[0] ?? null;

            this.runtime.dispatch(Operations.setEditingMode(targetMode));
            
            if (targetBlock) {
              const inlineId = isTextBlock(targetBlock) ? (targetBlock.children[0]?.id || "") : "";
              const pos: LogicalPosition = {
                sectionId: section.id,
                blockId: targetBlock.id,
                inlineId,
                offset: 0
              };
              this.runtime.dispatch(Operations.setSelection({ anchor: pos, focus: pos }));
              return;
            }
          }
        }
      }
    }

    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    const block = getAllBlocks(state.document)
      .find((b) => b.id === position.blockId);

    if (!block || !isTextBlock(block)) return;

    const fullText = block.children.map((r) => r.text).join("");

    const absoluteClickOffset =
      this.positionCalculator!.getOffsetInBlock(position);

    const isWord = (ch: string): boolean => /[a-zA-Z0-9À-ÿ_]/.test(ch);
    const isWhitespace = (ch: string): boolean => /\s/.test(ch);

    let wordStart = absoluteClickOffset;
    let wordEnd = absoluteClickOffset;

    if (absoluteClickOffset < fullText.length) {
      const ch = fullText[absoluteClickOffset];

      if (isWord(ch)) {
        while (wordStart > 0 && isWord(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isWord(fullText[wordEnd]))
          wordEnd++;
        if (
          wordEnd < fullText.length &&
          isWhitespace(fullText[wordEnd]) &&
          fullText[wordEnd] !== "\n"
        )
          wordEnd++;
      } else if (isWhitespace(ch)) {
        while (wordStart > 0 && isWhitespace(fullText[wordStart - 1]))
          wordStart--;
        while (wordEnd < fullText.length && isWhitespace(fullText[wordEnd]))
          wordEnd++;
      } else {
        const isPunct = (c: string): boolean => !isWord(c) && !isWhitespace(c);
        while (wordStart > 0 && isPunct(fullText[wordStart - 1])) wordStart--;
        while (wordEnd < fullText.length && isPunct(fullText[wordEnd]))
          wordEnd++;
      }
    } else if (fullText.length > 0) {
      wordEnd = fullText.length;
      wordStart = wordEnd;
      while (wordStart > 0 && isWhitespace(fullText[wordStart - 1]))
        wordStart--;
      if (wordStart > 0) {
        const type = isWord(fullText[wordStart - 1]);
        while (
          wordStart > 0 &&
          isWord(fullText[wordStart - 1]) === type &&
          !isWhitespace(fullText[wordStart - 1])
        )
          wordStart--;
      }
    }

    const resolvePos = (
      absoluteOffset: number,
    ): { inlineId: string; offset: number } => {
      let currentOffset = 0;
      for (const run of block.children) {
        const runEnd = currentOffset + run.text.length;
        if (absoluteOffset >= currentOffset && absoluteOffset <= runEnd) {
          return { inlineId: run.id, offset: absoluteOffset - currentOffset };
        }
        currentOffset = runEnd;
      }
      const lastRun = block.children[block.children.length - 1];
      return { inlineId: lastRun.id, offset: lastRun.text.length };
    };

    const anchorInfo = resolvePos(wordStart);
    const focusInfo = resolvePos(wordEnd);

    this.isDragging = false;
    this.runtime.dispatch(
      Operations.setSelection({
        anchor: {
          ...position,
          inlineId: anchorInfo.inlineId,
          offset: anchorInfo.offset,
        },
        focus: {
          ...position,
          inlineId: focusInfo.inlineId,
          offset: focusInfo.offset,
        },
      }),
    );

    // If format painter is active, a double click should format the selected word
    if (this.formatPainter.shouldApplyOnMouseUp()) {
      this.formatPainter.apply();
    }
  }

  /**
   * Selects the whole block (paragraph) on triple click.
   */
  handleTripleClick(event: MouseEvent): void {
    const position = this.cursorCalc.calculateFromMouseEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = getAllBlocks(state.document)
      .find((b) => b.id === position.blockId);

    if (!block || !isTextBlock(block)) return;

    const lastRun = block.children[block.children.length - 1];

    const anchorPos: LogicalPosition = {
      ...position,
      inlineId: block.children[0].id,
      offset: 0,
    };

    const focusPos: LogicalPosition = {
      ...position,
      inlineId: lastRun.id,
      offset: lastRun.text.length,
    };

    this.isDragging = false;
    this.runtime.dispatch(
      Operations.setSelection({ anchor: anchorPos, focus: focusPos }),
    );

    // If format painter is active, triple click should format the selected paragraph
    if (this.formatPainter.shouldApplyOnMouseUp()) {
      this.formatPainter.apply();
    }
  }

  refresh(): void {
    const state = this.runtime.getState();
    const layout = this.layoutService.compose(state.document);
    this.latestLayout = layout;
    this.positionCalculator = new PositionCalculator(layout);
    this.runtime.setLayout(layout);
    const viewModel = this.presenter.present({ state, layout });
    this.view.render(viewModel);
  }
}
