import { beforeEach, describe, expect, it } from "vitest";
import { createOasisEditor2 } from "../../app/bootstrap/createOasisEditor2App.js";

describe("OasisEditor2", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="oasis-editor-2-root"></div>
      <div id="oasis-editor-2-loading"></div>
    `;
  });

  it("renders the minimal hello world shell", () => {
    const root = document.getElementById("oasis-editor-2-root") as HTMLElement;
    const instance = createOasisEditor2(root);

    expect(root.querySelector(".oasis-editor-2-shell")).not.toBeNull();
    expect(root.textContent).toContain("Hello world");
    expect(root.textContent).toContain("oasis-editor-2");

    instance.dispose();
    expect(root.textContent).toBe("");
  });
});
