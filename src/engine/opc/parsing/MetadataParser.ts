import { DocumentIR } from "../../ir/DocumentIR.js";
import { parseXml, firstChild, getAttr, childElements } from "./XmlUtils.js";
import { OPCPackage } from "../OPCGraphBuilder.js";

export class MetadataParser {
  parse(opc: OPCPackage): DocumentIR["metadata"] {
    const corePart = opc.parts.get("docProps/core.xml");
    if (!corePart) return {};

    const doc = parseXml(corePart.content);
    const root = doc.documentElement;
    const metadata: DocumentIR["metadata"] = {};

    for (let i = 0; i < root.childNodes.length; i++) {
      const child = root.childNodes[i] as Element;
      if (child.nodeType !== 1) continue;
      const tag = child.localName;
      const text = child.textContent?.trim() ?? "";
      if (!text) continue;

      if (tag === "title") metadata.title = text;
      else if (tag === "creator") metadata.creator = text;
      else if (tag === "created") metadata.createdAt = new Date(text);
      else if (tag === "modified") metadata.modifiedAt = new Date(text);
    }

    return metadata;
  }
}
