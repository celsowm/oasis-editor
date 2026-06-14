import { afterEach, describe, expect, it, vi } from "vitest";
import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { Tabs } from "../../../../src/ui/components/Tabs/Tabs.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Tabs", () => {
  it("renders the default active panel", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Tabs
          ariaLabel="Plugin tabs"
          defaultValue="one"
          items={[
            {
              id: "one",
              label: "One",
              panel: <p>Panel one</p>,
              testId: "tab-one",
            },
            {
              id: "two",
              label: "Two",
              panel: <p>Panel two</p>,
              testId: "tab-two",
            },
          ]}
        />
      ),
      host,
    );

    expect(host.querySelector("[role='tablist']")).toBeTruthy();
    expect(host.textContent).toContain("Panel one");
    expect(
      (
        host.querySelector("[data-testid='tab-one']") as HTMLButtonElement
      ).getAttribute("aria-selected"),
    ).toBe("true");
    dispose();
  });

  it("changes active panel by click", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onChange = vi.fn();
    const dispose = render(
      () => (
        <Tabs
          defaultValue="one"
          onChange={onChange}
          items={[
            {
              id: "one",
              label: "One",
              panel: <p>Panel one</p>,
              testId: "tab-one",
            },
            {
              id: "two",
              label: "Two",
              panel: <p>Panel two</p>,
              testId: "tab-two",
            },
          ]}
        />
      ),
      host,
    );

    (
      host.querySelector("[data-testid='tab-two']") as HTMLButtonElement
    ).click();
    expect(onChange).toHaveBeenCalledWith("two");
    expect(
      (
        host.querySelector("[data-testid='tab-two']") as HTMLButtonElement
      ).getAttribute("aria-selected"),
    ).toBe("true");
    dispose();
  });

  it("changes active panel by keyboard and skips disabled tabs", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Tabs
          defaultValue="one"
          items={[
            {
              id: "one",
              label: "One",
              panel: <p>Panel one</p>,
              testId: "tab-one",
            },
            {
              id: "skip",
              label: "Skip",
              panel: <p>Panel skip</p>,
              disabled: true,
              testId: "tab-skip",
            },
            {
              id: "two",
              label: "Two",
              panel: <p>Panel two</p>,
              testId: "tab-two",
            },
          ]}
        />
      ),
      host,
    );

    const tablist = host.querySelector("[role='tablist']") as HTMLDivElement;
    tablist.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
    );
    expect(
      (
        host.querySelector("[data-testid='tab-two']") as HTMLButtonElement
      ).getAttribute("aria-selected"),
    ).toBe("true");
    expect(
      (host.querySelector("[data-testid='tab-skip']") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    dispose();
  });

  it("supports controlled value", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const ControlledTabs = () => {
      const [value, setValue] = createSignal("one");
      return (
        <Tabs
          value={value()}
          onChange={setValue}
          items={[
            {
              id: "one",
              label: "One",
              panel: <p>Panel one</p>,
              testId: "tab-one",
            },
            {
              id: "two",
              label: "Two",
              panel: <p>Panel two</p>,
              testId: "tab-two",
            },
          ]}
        />
      );
    };
    const dispose = render(() => <ControlledTabs />, host);

    (
      host.querySelector("[data-testid='tab-two']") as HTMLButtonElement
    ).click();
    expect(
      (
        host.querySelector("[data-testid='tab-two']") as HTMLButtonElement
      ).getAttribute("aria-selected"),
    ).toBe("true");
    dispose();
  });
});
