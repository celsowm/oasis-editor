/**
 * A lightweight hyperscript-like utility for creating DOM elements safely.
 */

type DOMProps = {
  [key: string]: any;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string>;
  onClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onInput?: (e: InputEvent) => void;
  onChange?: (e: Event) => void;
  onKeyDown?: (e: KeyboardEvent) => void;
};

type Child = Node | string | number | boolean | null | undefined | Child[];

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: DOMProps = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (key === "className") {
      element.className = value;
    } else if (key === "style" && typeof value === "object") {
      Object.assign(element.style, value);
    } else if (key === "dataset" && typeof value === "object") {
      for (const [dataKey, dataValue] of Object.entries(value)) {
        element.dataset[dataKey] = dataValue as string;
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.toLowerCase().substring(2);
      element.addEventListener(eventName, value as EventListener);
    } else {
      (element as Record<string, unknown>)[key] = value;
    }
  }

  appendChildren(element, children);

  return element;
}

function appendChildren(parent: Node, children: Child[]) {
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;

    if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
}

/**
 * Creates a DocumentFragment containing the given children.
 */
export function fragment(...children: Child[]): DocumentFragment {
  const f = document.createDocumentFragment();
  appendChildren(f, children);
  return f;
}
