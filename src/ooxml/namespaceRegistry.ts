export const WELL_KNOWN_NAMESPACES: Record<string, string> = {
  w: "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
  r: "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
  wp: "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
  a: "http://schemas.openxmlformats.org/drawingml/2006/main",
  pic: "http://schemas.openxmlformats.org/drawingml/2006/picture",
  m: "http://schemas.openxmlformats.org/officeDocument/2006/math",
  v: "urn:schemas-microsoft-com:vml",
  o: "urn:schemas-microsoft-com:office:office",
  w10: "urn:schemas-microsoft-com:office:word",
  w14: "http://schemas.microsoft.com/office/word/2010/wordml",
  w15: "http://schemas.microsoft.com/office/word/2012/wordml",
  w16cid: "http://schemas.microsoft.com/office/word/2016/wordml/cid",
  w16se: "http://schemas.microsoft.com/office/word/2015/wordml/symex",
  mc: "http://schemas.openxmlformats.org/markup-compatibility/2006",
  c: "http://schemas.openxmlformats.org/drawingml/2006/chart",
  dgm: "http://schemas.openxmlformats.org/drawingml/2006/diagram",
  a14: "http://schemas.microsoft.com/office/drawing/2010/main",
  b: "http://schemas.openxmlformats.org/officeDocument/2006/bibliography",
  sl: "http://schemas.openxmlformats.org/schemaLibrary/2006/main",
};

export class NamespaceRegistry {
  private prefixToUriMap: Map<string, string> = new Map();
  private uriToPrefixMap: Map<string, string> = new Map();

  constructor() {
    for (const [prefix, uri] of Object.entries(WELL_KNOWN_NAMESPACES)) {
      this.register(prefix, uri);
    }
  }

  public register(prefix: string, uri: string): void {
    if (!prefix || !uri) return;
    this.prefixToUriMap.set(prefix, uri);
    if (!this.uriToPrefixMap.has(uri)) {
      this.uriToPrefixMap.set(uri, prefix);
    }
  }

  public getUri(prefix: string): string | undefined {
    return this.prefixToUriMap.get(prefix);
  }

  public getPrefix(uri: string): string | undefined {
    return this.uriToPrefixMap.get(uri);
  }

  public collectFromElement(element: {
    attributes?: ArrayLike<{ name: string; value: string }> | null;
  }): void {
    if (!element.attributes) return;
    for (let i = 0; i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      if (attr.name === "xmlns") {
        this.register("default", attr.value);
      } else if (attr.name.startsWith("xmlns:")) {
        const prefix = attr.name.slice(6);
        this.register(prefix, attr.value);
      }
    }
  }

  public serializeNamespaces(neededPrefixes?: Iterable<string>): string {
    const prefixes = neededPrefixes
      ? Array.from(neededPrefixes)
      : Array.from(this.prefixToUriMap.keys());
    const attributes: string[] = [];
    for (const prefix of prefixes) {
      const uri = this.prefixToUriMap.get(prefix);
      if (uri) {
        if (prefix === "default") {
          attributes.push(`xmlns="${uri}"`);
        } else {
          attributes.push(`xmlns:${prefix}="${uri}"`);
        }
      }
    }
    return attributes.join(" ");
  }

  public clone(): NamespaceRegistry {
    const copy = new NamespaceRegistry();
    for (const [prefix, uri] of this.prefixToUriMap.entries()) {
      copy.register(prefix, uri);
    }
    return copy;
  }
}
