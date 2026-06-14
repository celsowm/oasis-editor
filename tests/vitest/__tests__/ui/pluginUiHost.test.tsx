import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { Editor } from "../../../../src/core/Editor.js";
import type { OasisPlugin } from "../../../../src/core/plugin.js";
import { PluginUiHost } from "../../../../src/ui/components/PluginUi/PluginUiHost.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("PluginUiHost", () => {
  it("renders floating actions and a docked side panel", async () => {
    const plugin: OasisPlugin = {
      name: "Assistant",
      commands: {
        toggleAssistant: {
          execute: (_payload, context) => {
            context?.ui.toggleSidePanel("assistant");
          },
        },
      },
      ui: {
        floatingActions: [
          {
            id: "assistant-action",
            command: "toggleAssistant",
            icon: "sparkles",
          },
        ],
        sidePanels: [
          {
            id: "assistant",
            title: "Assistant",
            mode: "dock",
            render: () => <p>Assistant content</p>,
          },
        ],
      },
    };
    const editor = await Editor.create({ plugins: [plugin] });
    const host = document.createElement("div");
    document.body.appendChild(host);

    const dispose = render(
      () => (
        <PluginUiHost editor={() => editor}>
          <div data-testid="main">Main</div>
        </PluginUiHost>
      ),
      host,
    );

    expect(host.textContent).toContain("Main");
    host
      .querySelector<HTMLButtonElement>(
        "[data-testid='plugin-floating-action-assistant-action']",
      )!
      .click();

    expect(host.textContent).toContain("Assistant content");
    expect(
      host.querySelector("[data-testid='plugin-side-panel-assistant']"),
    ).toBeTruthy();

    dispose();
    await editor.destroy();
  });
});
