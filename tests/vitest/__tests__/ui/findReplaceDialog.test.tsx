import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { FindReplaceDialog } from "@/ui/components/FindReplace/FindReplaceDialog.js";
import type { UseEditorFindReplaceResult } from "@/app/controllers/useEditorFindReplace.js";

afterEach(() => {
  document.body.innerHTML = "";
});

function createFindReplaceMock(): UseEditorFindReplaceResult {
  let searchTerm = "alpha";
  let replaceTerm = "beta";
  let options: ReturnType<UseEditorFindReplaceResult["findOptions"]> = {
    matchCase: false,
    wholeWord: false,
  };
  return {
    searchTerm: () => searchTerm,
    setSearchTerm: vi.fn((value: string) => {
      searchTerm = value;
    }),
    replaceTerm: () => replaceTerm,
    setReplaceTerm: vi.fn((value: string) => {
      replaceTerm = value;
    }),
    findOptions: () => options,
    setFindOptions: vi.fn((value) => {
      options = value;
    }),
    matches: () => [{ anchor: 0, focus: 5 }] as never,
    currentIndex: () => 0,
    findNext: vi.fn(),
    findPrevious: vi.fn(),
    replace: vi.fn(),
    replaceAll: vi.fn(),
    isOpen: () => true,
    setIsOpen: vi.fn(),
  };
}

describe("FindReplaceDialog", () => {
  it("renders migrated layout primitives and dispatches actions", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const fr = createFindReplaceMock();
    const dispose = render(() => <FindReplaceDialog fr={fr} />, host);

    const stacks = host.querySelectorAll(".oasis-editor-ui-stack");
    expect(stacks.length).toBeGreaterThanOrEqual(3);

    const searchInput = host.querySelector(
      "input[placeholder]",
    ) as HTMLInputElement;
    searchInput.value = "updated";
    searchInput.dispatchEvent(new InputEvent("input", { bubbles: true }));

    const buttons = host.querySelectorAll("button");
    buttons[1]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    buttons[2]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    const checkbox = host.querySelector(
      "input[type='checkbox']",
    ) as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event("change", { bubbles: true }));

    expect(fr.setSearchTerm).toHaveBeenCalledWith("updated");
    expect(fr.findPrevious).toHaveBeenCalledOnce();
    expect(fr.findNext).toHaveBeenCalledOnce();
    expect(fr.setFindOptions).toHaveBeenCalledWith({
      matchCase: true,
      wholeWord: false,
    });
    dispose();
  });
});
