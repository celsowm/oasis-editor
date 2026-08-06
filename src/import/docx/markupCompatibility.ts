import { type Element as XmlElement } from "@xmldom/xmldom";

export const MARKUP_COMPATIBILITY_NS =
  "http://schemas.openxmlformats.org/markup-compatibility/2006";

export interface MarkupCompatibilityCapabilities {
  supportedNamespaces: ReadonlySet<string>;
}

export const DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES: MarkupCompatibilityCapabilities = {
  // Oasis deliberately declares no extension namespace globally. A namespace
  // is added only by a specialized parser that understands that extension's
  // semantics; otherwise AlternateContent degrades through mc:Fallback.
  supportedNamespaces: new Set<string>(),
};

export function extendMarkupCompatibilityCapabilities(
  base: MarkupCompatibilityCapabilities,
  ...namespaces: string[]
): MarkupCompatibilityCapabilities {
  return {
    supportedNamespaces: new Set([
      ...base.supportedNamespaces,
      ...namespaces,
    ]),
  };
}

function directElementChildren(element: XmlElement): XmlElement[] {
  const children: XmlElement[] = [];
  for (let index = 0; index < element.childNodes.length; index += 1) {
    const node = element.childNodes[index];
    if (node?.nodeType === node.ELEMENT_NODE) {
      children.push(node as XmlElement);
    }
  }
  return children;
}

function lookupNamespaceUri(
  element: XmlElement,
  prefix: string,
): string | undefined {
  let current: XmlElement | null = element;
  const attributeName = prefix ? `xmlns:${prefix}` : "xmlns";
  while (current) {
    const value = current.getAttribute(attributeName);
    if (value) {
      return value;
    }
    const parent = current.parentNode;
    current =
      parent?.nodeType === parent.ELEMENT_NODE
        ? (parent as XmlElement)
        : null;
  }
  return undefined;
}

function getMarkupCompatibilityAttribute(
  element: XmlElement,
  localName: string,
): string | undefined {
  return (
    element.getAttributeNS(MARKUP_COMPATIBILITY_NS, localName) ??
    element.getAttribute(`mc:${localName}`) ??
    undefined
  );
}

function inheritedMarkupCompatibilityTokens(
  element: XmlElement,
  attributeName: "Ignorable" | "ProcessContent",
): Array<{ element: XmlElement; token: string }> {
  const chain: XmlElement[] = [];
  let current: XmlElement | null = element;
  while (current) {
    chain.push(current);
    const parent = current.parentNode;
    current =
      parent?.nodeType === parent.ELEMENT_NODE
        ? (parent as XmlElement)
        : null;
  }

  const result: Array<{ element: XmlElement; token: string }> = [];
  for (const owner of chain.reverse()) {
    const raw = getMarkupCompatibilityAttribute(owner, attributeName);
    if (!raw) {
      continue;
    }
    for (const token of raw.split(/\s+/).filter(Boolean)) {
      result.push({ element: owner, token });
    }
  }
  return result;
}

function getIgnorableNamespaces(element: XmlElement): Set<string> {
  const namespaces = new Set<string>();
  for (const entry of inheritedMarkupCompatibilityTokens(
    element,
    "Ignorable",
  )) {
    const namespace = lookupNamespaceUri(entry.element, entry.token);
    if (namespace) {
      namespaces.add(namespace);
    }
  }
  return namespaces;
}

function expandedName(
  element: XmlElement,
  token: string,
): string | undefined {
  const separator = token.indexOf(":");
  if (separator < 1 || separator === token.length - 1) {
    return undefined;
  }
  const prefix = token.slice(0, separator);
  const localName = token.slice(separator + 1);
  const namespace = lookupNamespaceUri(element, prefix);
  return namespace ? `${namespace}\u0000${localName}` : undefined;
}

function getProcessContentNames(element: XmlElement): Set<string> {
  const names = new Set<string>();
  for (const entry of inheritedMarkupCompatibilityTokens(
    element,
    "ProcessContent",
  )) {
    const name = expandedName(entry.element, entry.token);
    if (name) {
      names.add(name);
    }
  }
  return names;
}

function choiceIsSupported(
  choice: XmlElement,
  capabilities: MarkupCompatibilityCapabilities,
): boolean {
  const requires = choice.getAttribute("Requires")?.trim();
  if (!requires) {
    return false;
  }
  return requires.split(/\s+/).every((prefix): boolean => {
    const namespace = lookupNamespaceUri(choice, prefix);
    return Boolean(
      namespace && capabilities.supportedNamespaces.has(namespace),
    );
  });
}

function resolveAlternateContentBranch(
  alternateContent: XmlElement,
  capabilities: MarkupCompatibilityCapabilities,
): XmlElement | undefined {
  let fallback: XmlElement | undefined;
  for (const child of directElementChildren(alternateContent)) {
    if (child.namespaceURI !== MARKUP_COMPATIBILITY_NS) {
      continue;
    }
    if (child.localName === "Choice" && choiceIsSupported(child, capabilities)) {
      return child;
    }
    if (child.localName === "Fallback") {
      fallback = child;
    }
  }
  return fallback;
}

/**
 * Returns the effective direct children after applying the parts of ECMA-376
 * Markup Compatibility needed by semantic import:
 *
 * - first satisfiable mc:Choice, otherwise mc:Fallback;
 * - mc:Ignorable filtering for unsupported extension namespaces;
 * - mc:ProcessContent unwrapping for ignorable wrapper elements.
 *
 * PreserveElements/PreserveAttributes remain the responsibility of the source
 * fragment layer, which retains the original XML for round-trip export.
 */
export function getMarkupCompatibleChildren(
  element: XmlElement,
  capabilities: MarkupCompatibilityCapabilities =
    DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES,
): XmlElement[] {
  const result: XmlElement[] = [];
  const ignorableNamespaces = getIgnorableNamespaces(element);
  const processContentNames = getProcessContentNames(element);

  for (const child of directElementChildren(element)) {
    if (
      child.namespaceURI === MARKUP_COMPATIBILITY_NS &&
      child.localName === "AlternateContent"
    ) {
      const branch = resolveAlternateContentBranch(child, capabilities);
      if (branch) {
        result.push(...getMarkupCompatibleChildren(branch, capabilities));
      }
      continue;
    }

    const namespace = child.namespaceURI ?? "";
    const isUnsupportedIgnorable =
      ignorableNamespaces.has(namespace) &&
      !capabilities.supportedNamespaces.has(namespace);
    if (isUnsupportedIgnorable) {
      const name = `${namespace}\u0000${child.localName}`;
      if (processContentNames.has(name)) {
        result.push(...getMarkupCompatibleChildren(child, capabilities));
      }
      continue;
    }

    result.push(child);
  }

  return result;
}
