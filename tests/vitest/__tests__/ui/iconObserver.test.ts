import { afterEach, describe, expect, it } from "vitest";
import { startIconObserver, stopIconObserver } from "@/ui/utils/IconManager.js";

const roots: HTMLElement[] = [];
const createRoot = (): HTMLElement => {
  const root = document.createElement("div");
  roots.push(root);
  document.body.append(root);
  return root;
};
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};
afterEach(() => {
  for (const root of roots.splice(0)) {
    stopIconObserver(root);
    stopIconObserver(root);
    root.remove();
  }
});

describe("incremental icon observation", () => {
  it("resolves new placeholders without replacing existing SVGs on unrelated mutations", async () => {
    const root = createRoot();
    root.innerHTML = '<i data-lucide="copy"></i>';
    startIconObserver(root);
    const original = root.querySelector("svg");
    root.append(document.createElement("div"));
    await settle();
    expect(root.querySelector("svg")).toBe(original);
    const next = document.createElement("i");
    next.dataset.lucide = "scissors";
    root.append(next);
    await settle();
    expect(root.querySelectorAll("svg")).toHaveLength(2);
    expect(root.querySelector("svg")).toBe(original);
    expect(root.querySelectorAll("i[data-lucide]")).toHaveLength(0);
    expect(original?.getAttribute("aria-hidden")).toBe("true");
  });

  it("preserves explicit names and updates an icon when its own name changes", async () => {
    const root = createRoot();
    root.innerHTML =
      '<i data-lucide="copy" role="img" aria-label="Copy reference"></i>';
    startIconObserver(root);
    root.querySelector("svg")!.setAttribute("data-lucide", "scissors");
    await settle();
    expect(root.querySelector("svg")?.getAttribute("aria-label")).toBe(
      "Copy reference",
    );
    expect(root.querySelector("svg")?.getAttribute("data-lucide")).toBe(
      "scissors",
    );
    expect(root.querySelector("svg")?.getAttribute("aria-hidden")).toBeNull();
  });

  it("keeps a shared observer alive until both editor subscriptions are released", async () => {
    const root = createRoot();
    startIconObserver(root);
    startIconObserver(root);
    stopIconObserver(root);
    root.innerHTML = '<i data-lucide="copy"></i>';
    await settle();
    expect(root.querySelector("svg")).not.toBeNull();
    stopIconObserver(root);
    root.innerHTML = '<i data-lucide="scissors"></i>';
    await settle();
    expect(root.querySelector("svg")).toBeNull();
  });
});
