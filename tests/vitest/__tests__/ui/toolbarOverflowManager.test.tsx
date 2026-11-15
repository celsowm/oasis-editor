import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSignal, For } from "solid-js";
import { render } from "solid-js/web";
import { ToolbarOverflowManager } from "@/ui/components/Toolbar/ToolbarOverflowManager.js";

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe(): void {}
      disconnect(): void {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

const wrapperIds = (host: HTMLElement): (string | null)[] =>
  Array.from(
    host.querySelectorAll(".oasis-editor-toolbar-item-wrapper button"),
  ).map((b) => b.getAttribute("data-id"));

describe("ToolbarOverflowManager", () => {
  it("keeps updating items after some of them moved to the overflow menu", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const [ids, setIds] = createSignal(["a", "b", "c", "d", "e"]);
    const dispose = render(
      () => (
        <ToolbarOverflowManager>
          <For each={ids()}>
            {(id) => (
              <button type="button" data-id={id}>
                {id}
              </button>
            )}
          </For>
        </ToolbarOverflowManager>
      ),
      host,
    );
    const menu = host.querySelector(".oasis-editor-toolbar-overflow-menu")!;
    // What `updateOverflow` does when the strip is narrow: the tail goes to the menu.
    const overflowTail = (): void => {
      const wrappers = Array.from(
        host.querySelectorAll(".oasis-editor-toolbar-item-wrapper"),
      );
      menu.append(...wrappers.slice(-2));
    };

    for (const next of [
      ["a", "b", "x", "c", "d", "e"],
      ["a", "b", "c", "d", "e"],
      ["e", "d", "c", "b", "a"],
      ["a", "c", "e"],
      ["a", "b", "c", "d", "e"],
    ]) {
      overflowTail();
      expect(() => setIds(next)).not.toThrow();
      expect(new Set(wrapperIds(host))).toEqual(new Set(next));
      expect(wrapperIds(host)).toHaveLength(next.length);
    }
    dispose();
  });
});
