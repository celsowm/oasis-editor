import { afterEach, describe, expect, it } from "vitest";
import { render } from "solid-js/web";
import { RevisionMarkupOverlay } from "@/ui/components/RevisionMarkupOverlay.js";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("RevisionMarkupOverlay", () => {
  it("renders one decoration per box with the correct type attribute", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const boxes = [
      { revisionId: "i1", type: "insert" as const, left: 100, top: 100, width: 48, height: 16 },
      { revisionId: "d1", type: "delete" as const, left: 148, top: 120, width: 32, height: 16 },
    ];
    const dispose = render(
      () => <RevisionMarkupOverlay boxes={() => boxes} />,
      container,
    );

    const marks = container.querySelectorAll(
      "[data-testid='editor-revision-markup']",
    );
    expect(marks).toHaveLength(2);
    expect(container.querySelector(".oasis-editor-revision-markup-insert")).not.toBeNull();
    expect(container.querySelector(".oasis-editor-revision-markup-delete")).not.toBeNull();
    expect(
      container.querySelector("[data-revision-id='i1']")?.getAttribute("data-revision-type"),
    ).toBe("insert");
    expect(
      container.querySelector("[data-revision-id='d1']")?.getAttribute("data-revision-type"),
    ).toBe("delete");

    dispose();
  });

  it("renders nothing without boxes", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(
      () => <RevisionMarkupOverlay boxes={() => []} />,
      container,
    );
    expect(
      container.querySelectorAll("[data-testid='editor-revision-markup']"),
    ).toHaveLength(0);
    dispose();
  });
});
