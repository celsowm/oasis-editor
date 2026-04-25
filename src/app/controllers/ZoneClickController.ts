import { DocumentRuntime } from "../../core/runtime/DocumentRuntime.js";
import { Operations } from "../../core/operations/OperationFactory.js";
import { LayoutState } from "../../core/layout/LayoutTypes.js";
import { PageTemplate } from "../../core/pages/PageTemplateTypes.js";
import { isTextBlock, BlockNode } from "../../core/document/BlockTypes.js";
import { LogicalPosition } from "../../core/selection/SelectionTypes.js";
import { DomHitTester } from "../services/DomHitTester.js";

export class ZoneClickController {
  constructor(
    private runtime: DocumentRuntime,
    private getLatestLayout: () => LayoutState | null,
    private getTemplates: () => Record<string, PageTemplate>,
    private domHitTester: DomHitTester,
  ) {}

  handleDblClick(event: MouseEvent): boolean {
    event.preventDefault();

    const element = this.domHitTester.elementFromPoint(event.clientX, event.clientY);
    const pageEl = element
      ? (this.domHitTester.closest(".oasis-page", element) as HTMLElement | null)
      : null;

    if (!pageEl) return false;

    const pageId = pageEl.dataset.pageId;
    const page = this.getLatestLayout()?.pages.find((p) => p.id === pageId);
    const template = page ? this.getTemplates()[page.templateId] : null;

    if (!page || !template) return false;

    const rect = pageEl.getBoundingClientRect();
    const scale = rect.height / page.rect.height;
    const clickX = (event.clientX - rect.left) / scale;
    const clickY = (event.clientY - rect.top) / scale;

    const { margins } = template;
    const pageHeight = page.rect.height;

    const lastMainFragment = page.fragments[page.fragments.length - 1];
    const lastContentY = lastMainFragment
      ? lastMainFragment.rect.y + lastMainFragment.rect.height
      : margins.top;
    const firstMainFragment = page.fragments[0];
    const firstContentY = firstMainFragment
      ? firstMainFragment.rect.y
      : pageHeight - margins.bottom;

    let targetMode: "main" | "header" | "footer" = "main";

    const isHeaderZone =
      clickY < margins.top ||
      (page.headerRect && this.isPointInRect(clickX, clickY, page.headerRect)) ||
      clickY < firstContentY - 8;

    const isFooterZone =
      clickY > pageHeight - margins.bottom ||
      (page.footerRect && this.isPointInRect(clickX, clickY, page.footerRect)) ||
      clickY > lastContentY + 8;

    if (isHeaderZone) targetMode = "header";
    else if (isFooterZone) targetMode = "footer";

    const state = this.runtime.getState();
    if (targetMode !== state.editingMode) {
      const section = state.document.sections.find(
        (s) => s.id === page.sectionId,
      );
      if (section) {
        let targetBlock: BlockNode | null = null;
        if (targetMode === "header") targetBlock = section.header?.[0] ?? null;
        else if (targetMode === "footer")
          targetBlock = section.footer?.[0] ?? null;
        else targetBlock = section.children[0] ?? null;

        this.runtime.dispatch(Operations.setEditingMode(targetMode));

        if (targetBlock) {
          const inlineId = isTextBlock(targetBlock)
            ? targetBlock.children[0]?.id || ""
            : "";
          const pos: LogicalPosition = {
            sectionId: section.id,
            blockId: targetBlock.id,
            inlineId,
            offset: 0,
          };
          this.runtime.dispatch(
            Operations.setSelection({ anchor: pos, focus: pos }),
          );
          return true;
        }
      }
    }

    return false;
  }

  private isPointInRect(
    x: number,
    y: number,
    rect: { x: number; y: number; width: number; height: number },
  ): boolean {
    return (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    );
  }
}
