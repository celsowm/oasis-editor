import { DropdownChevron } from "@/ui/components/Toolbar/primitives/DropdownChevron.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal, Show } from "solid-js";
import { render } from "solid-js/web";
import { ToolIcon } from "@/ui/utils/customIcons.js";
import { startIconObserver, stopIconObserver } from "@/ui/utils/IconManager.js";
const cleanups: Array<() => void> = [];
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(() => {
  cleanups.splice(0).forEach((dispose) => dispose());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("reactive Ribbon artwork", () => {
  it("keeps one owned icon when names change among sibling elements", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const [name, setName] = createSignal("copy");
    startIconObserver(root);
    const dispose = render(
      () => (
        <button>
          <ToolIcon name={name()} />
          <span>Action label</span>
        </button>
      ),
      root,
    );
    cleanups.push(() => {
      dispose();
      stopIconObserver(root);
    });
    await settle();
    expect(root.querySelector("svg")?.getAttribute("data-lucide")).toBe("copy");
    setName("scissors");
    await settle();
    expect(root.querySelector("svg")?.getAttribute("data-lucide")).toBe(
      "scissors",
    );
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelector("span")?.textContent).toBe("Action label");
    setName("pageHeader");
    await settle();
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelector("i[data-lucide]")).toBeNull();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    setName("unknown-ribbon-test-icon");
    await settle();
    expect(root.querySelector("i[data-lucide]")).not.toBeNull();
    expect(root.querySelector("svg")).toBeNull();
    expect(warning).toHaveBeenCalled();
    setName("undo");
    await settle();
    expect(root.querySelector("svg")?.getAttribute("data-lucide")).toBe("undo");
  });
  it("keeps one chevron through class changes and conditional menu disposal", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const [visible, setVisible] = createSignal(true);
    const [extraClass, setExtraClass] = createSignal("first-affordance");
    startIconObserver(root);
    const dispose = render(
      () => (
        <button>
          <Show when={visible()}>
            <DropdownChevron class={extraClass()} />
          </Show>
          <span>Menu label</span>
        </button>
      ),
      root,
    );
    cleanups.push(() => {
      dispose();
      stopIconObserver(root);
    });
    await settle();
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(root.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    setExtraClass("second-affordance");
    await settle();
    expect(root.querySelectorAll("svg")).toHaveLength(1);
    expect(
      root.querySelector("svg")?.classList.contains("second-affordance"),
    ).toBe(true);
    setVisible(false);
    await settle();
    expect(root.querySelector("svg")).toBeNull();
    expect(root.textContent).toBe("Menu label");
    setVisible(true);
    await settle();
    expect(root.querySelectorAll("svg")).toHaveLength(1);
  });
  it("renders distinct page-story and footnote paths without font-dependent SVG text", async () => {
    const root = document.createElement("div");
    document.body.append(root);
    const [name, setName] = createSignal("pageHeader");
    cleanups.push(render(() => <ToolIcon name={name()} />, root));
    const artwork = new Set<string>();
    for (const icon of [
      "pageHeader",
      "pageFooter",
      "pageHeaderFooter",
      "pageNumber",
      "pageCount",
      "pageNumberTop",
      "pageNumberBottom",
      "footnote",
    ]) {
      setName(icon);
      await settle();
      const svg = root.querySelector("svg")!;
      expect(svg).not.toBeNull();
      expect(svg.getAttribute("aria-hidden")).toBe("true");
      expect(svg.querySelector("text")).toBeNull();
      expect(svg.querySelector("path")).not.toBeNull();
      artwork.add(svg.innerHTML);
    }
    expect(artwork.size).toBe(8);
  });
});
