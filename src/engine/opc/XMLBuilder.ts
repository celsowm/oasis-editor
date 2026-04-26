function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export class XMLBuilder {
  private parts: string[] = [];

  declaration(): this {
    this.parts.push('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>');
    return this;
  }

  private tagName(ns: string, name: string): string {
    return ns ? `${ns}:${name}` : name;
  }

  open(
    ns: string,
    name: string,
    attrs: Record<string, string | number | boolean | undefined> = {},
  ): this {
    const attrStr = Object.entries(attrs)
      .filter(([, v]) => v !== undefined && v !== false)
      .map(([k, v]) => {
        const val = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
        return ` ${k}="${escapeXml(val)}"`;
      })
      .join("");
    this.parts.push(`<${this.tagName(ns, name)}${attrStr}>`);
    return this;
  }

  close(ns: string, name: string): this {
    this.parts.push(`</${this.tagName(ns, name)}>`);
    return this;
  }

  selfClose(
    ns: string,
    name: string,
    attrs: Record<string, string | number | boolean | undefined> = {},
  ): this {
    const attrStr = Object.entries(attrs)
      .filter(([, v]) => v !== undefined && v !== false)
      .map(([k, v]) => {
        const val = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
        return ` ${k}="${escapeXml(val)}"`;
      })
      .join("");
    this.parts.push(`<${this.tagName(ns, name)}${attrStr}/>`);
    return this;
  }

  text(content: string): this {
    this.parts.push(escapeXml(content));
    return this;
  }

  raw(xml: string): this {
    this.parts.push(xml);
    return this;
  }

  toString(): string {
    return this.parts.join("");
  }

  toBuffer(): Uint8Array {
    return new TextEncoder().encode(this.toString());
  }
}
