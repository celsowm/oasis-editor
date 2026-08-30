import { type Element as XmlElement, XMLSerializer } from "@xmldom/xmldom";

export const MARKUP_COMPATIBILITY_NS =
  "http://schemas.openxmlformats.org/markup-compatibility/2006";

export interface MarkupCompatibilityCapabilities {
  supportedNamespaces: ReadonlySet<string>;
}

export const DEFAULT_MARKUP_COMPATIBILITY_CAPABILITIES: MarkupCompatibilityCapabilities = {
  supportedNamespaces: new Set<string>(),
};

export interface PreservedMcMetadata {
  ignorable?: string;
  processContent?: string;
  preserveElements?: string;
  preserveAttributes?: string;
  alternateContentBlocks: string[];
}

export function extractMarkupCompatibilityMetadata(element: XmlElement): PreservedMcMetadata {
  const metadata: PreservedMcMetadata = {
    alternateContentBlocks: [],
  };

  const ignorable = element.getAttributeNS(MARKUP_COMPATIBILITY_NS, "Ignorable") || element.getAttribute("mc:Ignorable");
  if (ignorable) metadata.ignorable = ignorable;

  const processContent = element.getAttributeNS(MARKUP_COMPATIBILITY_NS, "ProcessContent") || element.getAttribute("mc:ProcessContent");
  if (processContent) metadata.processContent = processContent;

  const preserveElements = element.getAttributeNS(MARKUP_COMPATIBILITY_NS, "PreserveElements") || element.getAttribute("mc:PreserveElements");
  if (preserveElements) metadata.preserveElements = preserveElements;

  const preserveAttributes = element.getAttributeNS(MARKUP_COMPATIBILITY_NS, "PreserveAttributes") || element.getAttribute("mc:PreserveAttributes");
  if (preserveAttributes) metadata.preserveAttributes = preserveAttributes;

  const serializer = new XMLSerializer();
  for (let i = 0; i < element.childNodes.length; i++) {
    const child = element.childNodes[i];
    if (child && child.nodeType === child.ELEMENT_NODE) {
      const elem = child as XmlElement;
      if (elem.namespaceURI === MARKUP_COMPATIBILITY_NS && elem.localName === "AlternateContent") {
        metadata.alternateContentBlocks.push(serializer.serializeToString(elem));
      }
    }
  }

  return metadata;
}

export function serializeMcAttributes(metadata: PreservedMcMetadata): string {
  const attrs: string[] = [];
  if (metadata.ignorable) attrs.push(`mc:Ignorable="${metadata.ignorable}"`);
  if (metadata.processContent) attrs.push(`mc:ProcessContent="${metadata.processContent}"`);
  if (metadata.preserveElements) attrs.push(`mc:PreserveElements="${metadata.preserveElements}"`);
  if (metadata.preserveAttributes) attrs.push(`mc:PreserveAttributes="${metadata.preserveAttributes}"`);
  return attrs.join(" ");
}
