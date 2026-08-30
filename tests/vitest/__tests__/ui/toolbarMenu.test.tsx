import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { Menu } from "@/ui/components/Toolbar/primitives/Menu.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("toolbar Menu", () => {
  it("keeps the caption visible on large dropdown triggers", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <Menu icon="shapes" label="Formas" ribbonSize="large">
          <div />
        </Menu>
      ),
      host,
    );

    const button = host.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.classList.contains("oasis-editor-tool-button-ribbon-large"))
      .toBe(true);
    expect(
      button?.querySelector(".oasis-editor-tool-button-label")?.textContent,
    ).toBe("Formas");
    expect(
      button?.querySelector(".oasis-editor-dropdown-chevron"),
    ).not.toBeNull();

    dispose();
  });
});
