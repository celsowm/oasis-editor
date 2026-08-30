import { render } from "solid-js/web";
import { describe, expect, it } from "vitest";
import { createTranslator } from "@/i18n/index.js";
import { SectionGroup } from "@/ui/components/Toolbar/groups/SectionGroup.js";
import type { ToolbarActionApi } from "@/ui/components/Toolbar/schema/items.js";

function createApi(): ToolbarActionApi {
  return {
    commands: {
      canExecute: () => true,
      execute: () => undefined,
      state: () => ({
        isEnabled: true,
        isActive: false,
        value: undefined,
      }),
    },
    t: createTranslator(() => "pt-BR"),
    focusEditor: () => undefined,
  };
}

describe("SectionGroup", () => {
  it("renders identifiable orientation and section-break options", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(() => <SectionGroup api={createApi()} />, container);

    const panel = container.querySelector(".oasis-editor-section-panel");
    expect(panel).not.toBeNull();
    expect(panel?.querySelectorAll(".oasis-editor-section-option")).toHaveLength(
      4,
    );
    expect(panel?.textContent).toContain("Retrato");
    expect(panel?.textContent).toContain("Paisagem");
    expect(panel?.textContent).toContain("Próxima Página");
    expect(panel?.textContent).toContain("Contínua");
    expect(
      panel?.querySelector('[data-lucide="scissors-line-dashed"]'),
    ).not.toBeNull();

    dispose();
  });
});
