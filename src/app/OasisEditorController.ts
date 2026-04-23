import { Operations } from "../core/operations/OperationFactory.js";
import { DocumentRuntime } from "../core/runtime/DocumentRuntime.js";
import { DocumentLayoutService } from "./services/DocumentLayoutService.js";
import { OasisEditorPresenter } from "./presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "./OasisEditorView.js";
import { LayoutState } from "../core/layout/LayoutTypes.js";
import { LayoutFragment } from "../core/layout/LayoutFragment.js";
import { LogicalPosition } from "../core/selection/SelectionTypes.js";
import { LineInfo } from "../core/layout/LayoutFragment.js";
import { PositionCalculator } from "./services/PositionCalculator.js";
import { isTextBlock } from "../core/document/BlockTypes.js";
import { TextMeasurementService } from "./services/TextMeasurementService.js";

export interface ControllerDeps {
  runtime: DocumentRuntime;
  layoutService: DocumentLayoutService;
  presenter: OasisEditorPresenter;
  view: OasisEditorView;
  measurementService: TextMeasurementService;
}

export class OasisEditorController {
  private runtime: DocumentRuntime;
  private layoutService: DocumentLayoutService;
  private presenter: OasisEditorPresenter;
  private view: OasisEditorView;
  private measurementService: TextMeasurementService;
  private latestLayout: LayoutState | null;
  private isDragging: boolean;
  private dragAnchor: LogicalPosition | null;
  private positionCalculator: PositionCalculator | null;

  // Table dragging
  private isTableDragging = false;
  private draggingTableId: string | null = null;
  private dropIndicator: HTMLElement | null = null;
  private tableGhost: HTMLElement | null = null;
  private currentDropTarget: { blockId: string; isBefore: boolean } | null =
    null;

  // Format Painter state
  private formatPainterActive: boolean = false;
  private formatPainterSticky: boolean = false;
  private formatPainterMarks: any = null;
  private formatPainterAlign: any = null;

  constructor({
    runtime,
    layoutService,
    presenter,
    view,
    measurementService,
  }: ControllerDeps) {
    this.runtime = runtime;
    this.layoutService = layoutService;
    this.presenter = presenter;
    this.view = view;
    this.measurementService = measurementService;
    this.latestLayout = null;
    this.isDragging = false;
    this.dragAnchor = null;
    this.positionCalculator = null;
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
    });

    this.view.elements.root.addEventListener("table-drag-start", (e: any) => {
      this.handleTableDragStart(e.detail.tableId, e.detail.originalEvent);
    });

    window.addEventListener("mousemove", (e) => {
      if (this.isTableDragging) this.handleTableDragging(e);
    });

    window.addEventListener("mouseup", (e) => {
      if (this.isTableDragging) this.handleTableMouseUp(e);
    });

    this.isDragging = false;
    this.dragAnchor = null;

    this.runtime.subscribe(() => {
      this.refresh();
    });
  }

  toggleFormatPainter(isDoubleClick: boolean = false): void {
    if (this.formatPainterActive && !isDoubleClick) {
      this.formatPainterActive = false;
      this.formatPainterSticky = false;
      this.formatPainterMarks = null;
      this.formatPainterAlign = null;
      this.view.setFormatPainterActive(false);
    } else {
      // If already active and double-clicked, upgrade to sticky
      if (this.formatPainterActive && isDoubleClick) {
        this.formatPainterSticky = true;
        this.view.setFormatPainterActive(true, true);
        return;
      }

      const state = this.runtime.getState();
      const selectionState = this.presenter.present({
        state,
        layout: this.latestLayout!,
      }).selectionState;

      const marks: any = {};
      if (selectionState.bold) marks.bold = true;
      if (selectionState.italic) marks.italic = true;
      if (selectionState.underline) marks.underline = true;
      if (selectionState.color) marks.color = selectionState.color;

      this.formatPainterMarks = marks;
      this.formatPainterAlign = selectionState.align;
      this.formatPainterActive = true;
      this.formatPainterSticky = isDoubleClick;
      this.view.setFormatPainterActive(true, isDoubleClick);
    }
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

    const blockBefore = stateBefore.document.sections
      .flatMap((s) => s.children)
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

  calculatePositionFromEvent(event: MouseEvent): LogicalPosition | null {
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const target = element
      ? (element.closest(".oasis-fragment") as HTMLElement | null)
      : null;

    if (!target) return null;

    const fragmentId = target.dataset["fragmentId"] ?? "";
    const blockId = target.dataset["blockId"] ?? "";
    const fragmentText = target.textContent ?? "";
    const rect = target.getBoundingClientRect();

    const clickXInFragment = event.clientX - rect.left;
    const clickYInFragment = event.clientY - rect.top;

    const sectionId = "section:0";

    const layoutFragments =
      this.latestLayout?.fragmentsByBlockId[blockId] ?? [];
    const layoutFragment =
      layoutFragments.find((f) => f.id === fragmentId) ?? layoutFragments[0];

    if (!layoutFragment) return null;

    let targetLine: LineInfo | null = layoutFragment.lines
      ? layoutFragment.lines[0]
      : null;
    if (layoutFragment?.lines) {
      let foundLine: LineInfo | null = null;
      for (const line of layoutFragment.lines) {
        const relativeLineY = line.y - layoutFragment.rect.y;
        if (
          clickYInFragment >= relativeLineY &&
          clickYInFragment < relativeLineY + line.height
        ) {
          foundLine = line;
          break;
        }
      }
      if (foundLine) {
        targetLine = foundLine;
      } else {
        const lastLine = layoutFragment.lines[layoutFragment.lines.length - 1];
        const unrelativeLastLineY = lastLine.y - layoutFragment.rect.y;
        if (clickYInFragment >= unrelativeLastLineY) {
          targetLine = lastLine;
        } else {
          targetLine = layoutFragment.lines[0];
        }
      }
    }

    let closestOffset = 0;
    let minDistance = Infinity;

    if (targetLine) {
      const lineStart = targetLine.offsetStart;
      const lineEnd = targetLine.offsetEnd;
      for (let i = lineStart; i <= lineEnd; i++) {
        const measuredWidth = this.measurementService.measureWidthUpToOffset(
          layoutFragment,
          targetLine,
          i,
        );
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    } else {
      for (let i = 0; i <= fragmentText.length; i++) {
        // Fallback for missing targetLine (should not happen with updated engine)
        const measuredWidth = this.measurementService.measureWidthUpToOffset(
          layoutFragment,
          {
            offsetStart: 0,
            offsetEnd: fragmentText.length,
            x: 0,
            width: layoutFragment.rect.width,
          } as any,
          i,
        );
        const distance = Math.abs(measuredWidth - clickXInFragment);
        if (distance < minDistance) {
          minDistance = distance;
          closestOffset = i;
        }
      }
    }

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap((s) => s.children)
      .find((b) => b.id === blockId);

    let actualRunId = fragmentId;
    let relativeOffset = closestOffset;

    if (block && isTextBlock(block)) {
      let currentOffset = 0;
      for (const run of block.children) {
        const runLength = run.text.length;
        if (
          closestOffset >= currentOffset &&
          closestOffset <= currentOffset + runLength
        ) {
          actualRunId = run.id;
          relativeOffset = closestOffset - currentOffset;
          break;
        }
        currentOffset += runLength;
      }
    }

    return {
      sectionId,
      blockId,
      inlineId: actualRunId,
      offset: relativeOffset,
    };
  }

  handleMouseDown(event: MouseEvent): void {
    const position = this.calculatePositionFromEvent(event);
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

    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    this.runtime.dispatch(
      Operations.setSelection({ anchor: this.dragAnchor!, focus: position }),
    );
  }

  handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;

      // If format painter is active, apply formatting on mouse up
      if (this.formatPainterActive && this.formatPainterMarks) {
        this.runtime.dispatch(
          Operations.applyFormat(
            this.formatPainterMarks,
            this.formatPainterAlign,
          ),
        );
        if (!this.formatPainterSticky) {
          this.toggleFormatPainter(); // Turn off after use
        }
      }
    }
  }

  /**
   * Selects the whole word under the click position, mirroring Word's double-click behaviour.
   */
  handleDblClick(event: MouseEvent): void {
    event.preventDefault();

    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap((s) => s.children)
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
    if (this.formatPainterActive && this.formatPainterMarks) {
      this.runtime.dispatch(
        Operations.applyFormat(
          this.formatPainterMarks,
          this.formatPainterAlign,
        ),
      );
      if (!this.formatPainterSticky) {
        this.toggleFormatPainter();
      }
    }
  }

  /**
   * Selects the whole block (paragraph) on triple click.
   */
  handleTripleClick(event: MouseEvent): void {
    const position = this.calculatePositionFromEvent(event);
    if (!position) return;

    const state = this.runtime.getState();
    const block = state.document.sections
      .flatMap((s) => s.children)
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
    if (this.formatPainterActive && this.formatPainterMarks) {
      this.runtime.dispatch(
        Operations.applyFormat(
          this.formatPainterMarks,
          this.formatPainterAlign,
        ),
      );
      if (!this.formatPainterSticky) {
        this.toggleFormatPainter();
      }
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

  private handleTableDragStart(tableId: string, event: MouseEvent): void {
    this.isTableDragging = true;
    this.draggingTableId = tableId;
    document.body.style.cursor = "grabbing";

    // Create Ghost element
    if (this.latestLayout) {
      // Find the table block to get its cells' IDs
      const state = this.runtime.getState();
      let tableBlock: any = null;
      for (const section of state.document.sections) {
        const found = section.children.find((b) => b.id === tableId);
        if (found) {
          tableBlock = found;
          break;
        }
      }

      if (tableBlock && tableBlock.kind === "table") {
        const cellIds = new Set<string>();
        tableBlock.rows.forEach((row: any) => {
          row.cells.forEach((cell: any) => cellIds.add(cell.id));
        });

        // Find all fragments that belong to these cells
        const fragments = Object.values(this.latestLayout.fragmentsByBlockId)
          .flat()
          .filter((f) => cellIds.has(f.blockId));

        if (fragments.length > 0) {
          // Calculate total bounding box of the table on its first page
          const firstPageId = fragments[0].pageId;
          const tableFragmentsOnPage = fragments.filter(
            (f) => f.pageId === firstPageId,
          );

          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          tableFragmentsOnPage.forEach((f) => {
            minX = Math.min(minX, f.rect.x);
            minY = Math.min(minY, f.rect.y);
            maxX = Math.max(maxX, f.rect.x + f.rect.width);
            maxY = Math.max(maxY, f.rect.y + f.rect.height);
          });

          this.tableGhost = document.createElement("div");
          this.tableGhost.className = "oasis-table-ghost";
          this.tableGhost.style.width = `${maxX - minX}px`;
          this.tableGhost.style.height = `${maxY - minY}px`;
          this.tableGhost.style.left = `${event.clientX}px`;
          this.tableGhost.style.top = `${event.clientY}px`;
          this.tableGhost.style.transform = "translate(-20px, -20px)";

          document.body.appendChild(this.tableGhost);
        }
      }
    }
  }

  private handleTableDragging(event: MouseEvent): void {
    if (!this.isTableDragging || !this.latestLayout) return;

    // Move ghost
    if (this.tableGhost) {
      this.tableGhost.style.left = `${event.clientX}px`;
      this.tableGhost.style.top = `${event.clientY}px`;
    }

    const dropTarget = this.findDropTarget(event);
    if (dropTarget) {
      this.currentDropTarget = dropTarget;
      this.showDropIndicator(dropTarget);
    } else {
      this.hideDropIndicator();
    }
  }

  private handleTableMouseUp(event: MouseEvent): void {
    if (!this.isTableDragging) return;

    if (this.currentDropTarget && this.draggingTableId) {
      this.runtime.dispatch(
        Operations.moveBlock(
          this.draggingTableId,
          this.currentDropTarget.blockId,
          this.currentDropTarget.isBefore,
        ),
      );
    }

    // Cleanup ghost
    if (this.tableGhost && this.tableGhost.parentElement) {
      this.tableGhost.parentElement.removeChild(this.tableGhost);
    }
    this.tableGhost = null;

    this.isTableDragging = false;
    this.draggingTableId = null;
    this.currentDropTarget = null;
    this.hideDropIndicator();
    document.body.style.cursor = "";
  }

  private findDropTarget(
    event: MouseEvent,
  ): { blockId: string; isBefore: boolean; rect: any; pageId: string } | null {
    // Find the fragment under or nearest to the mouse
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const fragmentEl = element?.closest(
      ".oasis-fragment",
    ) as HTMLElement | null;

    if (!fragmentEl) return null;

    const fragmentId = fragmentEl.dataset.fragmentId;
    const blockId = fragmentEl.dataset.blockId; // Need to ensure this is set in PageLayer
    if (!blockId) return null;

    const rect = fragmentEl.getBoundingClientRect();
    const isBefore = event.clientY < rect.top + rect.height / 2;

    return {
      blockId,
      isBefore,
      rect: {
        x: parseFloat(fragmentEl.style.left),
        y: parseFloat(fragmentEl.style.top),
        width: rect.width,
        height: rect.height,
      },
      pageId: fragmentEl.parentElement?.dataset.pageId || "",
    };
  }

  private showDropIndicator(target: any): void {
    if (!this.dropIndicator) {
      this.dropIndicator = document.createElement("div");
      this.dropIndicator.className = "oasis-drop-indicator";
      document.body.appendChild(this.dropIndicator);
    }

    const pageEl = this.view.elements.root.querySelector(
      `[data-page-id="${target.pageId}"]`,
    );
    if (!pageEl) return;

    if (this.dropIndicator.parentElement !== pageEl) {
      pageEl.appendChild(this.dropIndicator);
    }

    this.dropIndicator.style.display = "block";
    this.dropIndicator.style.left = `${target.rect.x}px`;
    this.dropIndicator.style.width = `${target.rect.width}px`;
    this.dropIndicator.style.top = `${target.isBefore ? target.rect.y - 2 : target.rect.y + target.rect.height - 1}px`;
  }

  private hideDropIndicator(): void {
    if (this.dropIndicator) {
      this.dropIndicator.style.display = "none";
    }
  }
}
