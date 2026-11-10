import { createElement, icons } from "lucide";
import { createEditorLogger } from "@/utils/logger.js";

const logger = createEditorLogger("icons");

const observers = new Map<
  HTMLElement,
  { observer: MutationObserver; users: number }
>();
const pendingSelector = "[data-lucide]:not(svg)";

function componentName(name: string): string {
  const camel = name
    .trim()
    .replace(/[-_\s]+(.)/g, (_, character: string) => character.toUpperCase());
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

function renderIcon(element: Element): void {
  const name = element.getAttribute("data-lucide");
  const icon = name
    ? icons[componentName(name) as keyof typeof icons]
    : undefined;
  if (!icon) {
    logger.warn("Unknown Lucide icon", { name });
    return;
  }
  const attributes = Object.fromEntries(
    Array.from(element.attributes, (attribute) => [
      attribute.name,
      attribute.value,
    ]),
  );
  const hasAccessibleName = Object.keys(attributes).some(
    (key) => key.startsWith("aria-") || key === "role" || key === "title",
  );
  const svg = createElement(icon, {
    ...(hasAccessibleName ? {} : { "aria-hidden": "true" }),
    ...attributes,
    class: [
      ...new Set([
        "lucide",
        `lucide-${name}`,
        ...(attributes.class ?? "").split(/\s+/),
      ]),
    ]
      .filter(Boolean)
      .join(" "),
  });
  element.replaceWith(svg);
}

/** Resolve placeholders once. Existing SVGs retain their identity on DOM changes. */
export function startIconObserver(root: HTMLElement = document.body): void {
  const existing = observers.get(root);
  if (existing) {
    existing.users++;
    return;
  }
  const scan = (): void =>
    root.querySelectorAll(pendingSelector).forEach(renderIcon);
  scan();
  const observer = new MutationObserver((mutations) => {
    let hasPending = false;
    const changedIcons = new Set<Element>();
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.target instanceof Element &&
        mutation.target.isConnected
      ) {
        changedIcons.add(mutation.target);
      }
      for (const node of mutation.addedNodes) {
        if (
          node instanceof Element &&
          node.isConnected &&
          (node.matches(pendingSelector) || node.querySelector(pendingSelector))
        )
          hasPending = true;
      }
    }
    if (!hasPending && !changedIcons.size) return;
    observer.disconnect();
    changedIcons.forEach(renderIcon);
    if (hasPending) scan();
    observe();
  });
  const observe = (): void =>
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-lucide"],
    });
  observers.set(root, { observer, users: 1 });
  observe();
}

/** Editors sharing an observer release their own subscription only. */
export function stopIconObserver(root: HTMLElement = document.body): void {
  const entry = observers.get(root);
  if (!entry || --entry.users > 0) return;
  entry.observer.disconnect();
  observers.delete(root);
}
