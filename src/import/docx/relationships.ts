import JSZip from "jszip";
import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";

export function parseRelationshipsXml(xml: string | null | undefined): Map<string, string> {
  const relsMap = new Map<string, string>();
  if (!xml) {
    return relsMap;
  }

  const relsDoc = new DOMParser().parseFromString(xml, "application/xml");
  const relNodes = relsDoc.documentElement?.childNodes;
  if (!relNodes) {
    return relsMap;
  }

  for (let index = 0; index < relNodes.length; index += 1) {
    const node = relNodes[index];
    if (node?.nodeType === 1) {
      const rel = node as XmlElement;
      if (rel.localName === "Relationship") {
        const id = rel.getAttribute("Id");
        const target = rel.getAttribute("Target");
        if (id && target) {
          relsMap.set(id, target);
        }
      }
    }
  }

  return relsMap;
}

export async function loadPartRelationships(zip: JSZip, partPath: string): Promise<Map<string, string>> {
  const slashIndex = partPath.lastIndexOf("/");
  const directory = slashIndex >= 0 ? partPath.slice(0, slashIndex) : "";
  const fileName = slashIndex >= 0 ? partPath.slice(slashIndex + 1) : partPath;
  const relsPath = directory ? `${directory}/_rels/${fileName}.rels` : `_rels/${fileName}.rels`;
  return parseRelationshipsXml(await zip.file(relsPath)?.async("string"));
}
