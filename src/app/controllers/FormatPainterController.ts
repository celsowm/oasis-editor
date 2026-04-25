import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { OasisEditorPresenter } from "../presenters/OasisEditorPresenter.js";
import { OasisEditorView } from "../OasisEditorView.js";
import { MarkSet } from "../../core/document/BlockTypes.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";

export class FormatPainterController {
  private active = false;
  private sticky = false;
  private marks: MarkSet | null = null;
  private align: "left" | "center" | "right" | "justify" | null = null;

  constructor(
    private runtime: DocumentRuntime,
    private presenter: OasisEditorPresenter,
    private view: OasisEditorView,
    private getLatestLayout: () => LayoutState,
  ) {}

  get isActive(): boolean { return this.active; }
  get isSticky(): boolean { return this.sticky; }

  toggle(isDoubleClick = false): void {
    if (this.active && !isDoubleClick) {
      this.active = false;
      this.sticky = false;
      this.marks = null;
      this.align = null;
      this.view.setFormatPainterActive(false);
    } else {
      if (this.active && isDoubleClick) {
        this.sticky = true;
        this.view.setFormatPainterActive(true, true);
        return;
      }
      const state = this.runtime.getState();
      const selectionState = this.presenter.present({
        state,
        layout: this.getLatestLayout(),
      }).selectionState;

      const marks: MarkSet = {};
      if (selectionState.bold) marks.bold = true;
      if (selectionState.italic) marks.italic = true;
      if (selectionState.underline) marks.underline = true;
      if (selectionState.color) marks.color = selectionState.color;

      this.marks = marks;
      this.align = selectionState.align;
      this.active = true;
      this.sticky = isDoubleClick;
      this.view.setFormatPainterActive(true, isDoubleClick);
    }
  }

  apply(): void {
    if (!this.active || !this.marks) return;
    this.runtime.dispatch(
      Operations.applyFormat(this.marks, this.align ?? undefined),
    );
    if (!this.sticky) {
      this.toggle();
    }
  }

  shouldApplyOnMouseUp(): boolean {
    return this.active && this.marks !== null;
  }
}
