import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { EditorImportProgressOverlay } from "@/ui/EditorImportProgressOverlay.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("EditorImportProgressOverlay", () => {
  it("shows font preparation as an indeterminate import phase", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const dispose = render(
      () => (
        <EditorImportProgressOverlay
          progress={() => ({ phase: "preparing-fonts", progress: 90 })}
        />
      ),
      host,
    );

    expect(
      host.querySelector("[data-testid='editor-import-phase']")?.textContent,
    ).toBe("Preparando fontes");
    expect(
      host
        .querySelector("[data-testid='editor-import-progress-bar']")
        ?.classList.contains("oasis-editor-import-progress-bar-indeterminate"),
    ).toBe(true);
    expect(host.textContent).toContain("90%");
    dispose();
  });
});
