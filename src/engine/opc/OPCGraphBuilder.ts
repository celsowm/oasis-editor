import { parseXml } from "./parsing/XmlUtils.js";

export interface ContentTypeEntry {
  extension?: string;
  partName?: string;
  contentType: string;
}

export interface Relationship {
  id: string;
  type: string;
  target: string;
  targetMode?: "External" | "Internal";
}

export interface OPCPart {
  name: string;
  contentType: string;
  content: Uint8Array;
  relationships: Relationship[];
}

export interface OPCPackage {
  contentTypes: ContentTypeEntry[];
  packageRelationships: Relationship[];
  parts: Map<string, OPCPart>;
  mainDocument?: OPCPart;
}

const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";

const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_DOC_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";

function getChildren(parent: Element, ns: string, localName: string): Element[] {
  const result: Element[] = [];
  for (let i = 0; i < parent.childNodes.length; i++) {
    const child = parent.childNodes[i] as unknown as Element;
    if (child.nodeType === 1 && child.localName === localName) {
      result.push(child);
    }
  }
  return result;
}

function getAttr(el: Element, name: string): string | null {
  return el.getAttribute(name);
}

export class OPCGraphBuilder {
  async build(entries: Map<string, Uint8Array>): Promise<OPCPackage> {
    const contentTypes = this.parseContentTypes(entries.get("[Content_Types].xml"));
    const packageRels = this.parseRelationships(entries.get("_rels/.rels"));

    const parts = new Map<string, OPCPart>();

    for (const [name, content] of entries) {
      if (name === "[Content_Types].xml" || name.endsWith(".rels")) continue;

      const contentType = this.resolveContentType(name, contentTypes);
      const relsPath = this.getRelationshipsPath(name);
      const rels = entries.has(relsPath)
        ? this.parseRelationships(entries.get(relsPath))
        : [];

      const part: OPCPart = { name, contentType, content, relationships: rels };
      parts.set(name, part);
    }

    // Resolve part relationships into the part objects
    for (const part of parts.values()) {
      part.relationships = part.relationships.map((rel) => ({
        ...rel,
        target: this.resolveTarget(part.name, rel.target),
      }));
    }

    const mainRel = packageRels.find((r) => r.type === OFFICE_DOC_REL);
    const mainDocument = mainRel ? parts.get(mainRel.target) : undefined;

    return {
      contentTypes,
      packageRelationships: packageRels,
      parts,
      mainDocument,
    };
  }

  private parseContentTypes(buffer?: Uint8Array): ContentTypeEntry[] {
    if (!buffer) return [];
    const doc = parseXml(buffer);
    const root = doc.documentElement;
    const entries: ContentTypeEntry[] = [];

    for (const child of getChildren(root, CT_NS, "Default")) {
      const ext = getAttr(child, "Extension");
      const ct = getAttr(child, "ContentType");
      if (ext && ct) entries.push({ extension: ext.toLowerCase(), contentType: ct });
    }

    for (const child of getChildren(root, CT_NS, "Override")) {
      const pn = getAttr(child, "PartName");
      const ct = getAttr(child, "ContentType");
      if (pn && ct) entries.push({ partName: pn, contentType: ct });
    }

    return entries;
  }

  private parseRelationships(buffer?: Uint8Array): Relationship[] {
    if (!buffer) return [];
    const doc = parseXml(buffer);
    const root = doc.documentElement;
    const rels: Relationship[] = [];

    for (const child of getChildren(root, RELS_NS, "Relationship")) {
      const id = getAttr(child, "Id");
      const type = getAttr(child, "Type");
      const target = getAttr(child, "Target");
      const targetMode = getAttr(child, "TargetMode") as "External" | "Internal" | null;
      if (id && type && target) {
        rels.push({ id, type, target, targetMode: targetMode || undefined });
      }
    }

    return rels;
  }

  private resolveContentType(partName: string, entries: ContentTypeEntry[]): string {
    // Check overrides first
    const override = entries.find(
      (e) => e.partName && e.partName.toLowerCase() === "/" + partName.toLowerCase(),
    );
    if (override) return override.contentType;

    // Fall back to extension
    const ext = partName.split(".").pop()?.toLowerCase();
    if (ext) {
      const def = entries.find((e) => e.extension === ext);
      if (def) return def.contentType;
    }

    return "application/octet-stream";
  }

  private getRelationshipsPath(partName: string): string {
    const idx = partName.lastIndexOf("/");
    const dir = idx >= 0 ? partName.substring(0, idx + 1) : "";
    const name = idx >= 0 ? partName.substring(idx + 1) : partName;
    return dir + "_rels/" + name + ".rels";
  }

  private resolveTarget(sourcePart: string, target: string): string {
    if (target.startsWith("/")) return target.substring(1);

    const sourceDir = sourcePart.includes("/")
      ? sourcePart.substring(0, sourcePart.lastIndexOf("/") + 1)
      : "";

    let result = sourceDir + target;
    // Normalize ../
    const parts = result.split("/");
    const stack: string[] = [];
    for (const p of parts) {
      if (p === "..") stack.pop();
      else if (p !== "." && p !== "") stack.push(p);
    }
    return stack.join("/");
  }
}
