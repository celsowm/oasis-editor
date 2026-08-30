import { DOMParser, XMLSerializer } from "@xmldom/xmldom";
import { NamespaceRegistry } from "../../../ooxml/namespaceRegistry.js";
import {
  extractMarkupCompatibilityMetadata,
  serializeMcAttributes,
} from "../../../ooxml/markupCompatibilityEngine.js";

export function preserveNamespacesAndMc(
  sourceXml: string,
  rebuiltXml: string,
): string {
  const parser = new DOMParser();
  const sourceDoc = parser.parseFromString(sourceXml, "application/xml");
  const rebuiltDoc = parser.parseFromString(rebuiltXml, "application/xml");

  const sourceRoot = sourceDoc.documentElement;
  const rebuiltRoot = rebuiltDoc.documentElement;

  if (!sourceRoot || !rebuiltRoot) {
    return rebuiltXml;
  }

  const registry = new NamespaceRegistry();
  registry.collectFromElement(sourceRoot);
  registry.collectFromElement(rebuiltRoot);

  const mcMetadata = extractMarkupCompatibilityMetadata(sourceRoot);
  const mcAttrStr = serializeMcAttributes(mcMetadata);

  if (mcAttrStr) {
    const existingMc = extractMarkupCompatibilityMetadata(rebuiltRoot);
    if (!existingMc.ignorable && mcMetadata.ignorable) {
      rebuiltRoot.setAttribute("mc:Ignorable", mcMetadata.ignorable);
    }
    if (!existingMc.preserveElements && mcMetadata.preserveElements) {
      rebuiltRoot.setAttribute(
        "mc:PreserveElements",
        mcMetadata.preserveElements,
      );
    }
    if (!existingMc.preserveAttributes && mcMetadata.preserveAttributes) {
      rebuiltRoot.setAttribute(
        "mc:PreserveAttributes",
        mcMetadata.preserveAttributes,
      );
    }
  }

  return new XMLSerializer().serializeToString(rebuiltDoc);
}
