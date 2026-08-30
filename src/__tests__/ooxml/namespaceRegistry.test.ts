import { describe, it, expect } from "vitest";
import { NamespaceRegistry } from "../../ooxml/namespaceRegistry.js";
import {
  sortXmlNodesBySchemaOrder,
  P_PR_CHILD_ORDER,
  R_PR_CHILD_ORDER,
} from "../../ooxml/schemaOrder.js";

describe("NamespaceRegistry", () => {
  it("registers well known namespaces by default", () => {
    const registry = new NamespaceRegistry();
    expect(registry.getUri("w")).toBe(
      "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    );
    expect(
      registry.getPrefix(
        "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
      ),
    ).toBe("w");
  });

  it("registers custom namespace prefixes", () => {
    const registry = new NamespaceRegistry();
    registry.register(
      "w14",
      "http://schemas.microsoft.com/office/word/2010/wordml",
    );
    expect(registry.getUri("w14")).toBe(
      "http://schemas.microsoft.com/office/word/2010/wordml",
    );
  });

  it("serializes namespaces string", () => {
    const registry = new NamespaceRegistry();
    const xmlNs = registry.serializeNamespaces(["w", "r"]);
    expect(xmlNs).toContain(
      'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"',
    );
    expect(xmlNs).toContain(
      'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"',
    );
  });
});

describe("SchemaOrder", () => {
  it("sorts pPr child elements correctly according to OOXML schema", () => {
    const elements = ["w:jc", "w:pStyle", "w:ind", "w:keepNext"];
    const sorted = sortXmlNodesBySchemaOrder(
      elements,
      (name) => name,
      P_PR_CHILD_ORDER,
    );
    expect(sorted).toEqual(["w:pStyle", "w:keepNext", "w:ind", "w:jc"]);
  });

  it("sorts rPr child elements correctly according to OOXML schema", () => {
    const elements = ["w:color", "w:rStyle", "w:b", "w:sz"];
    const sorted = sortXmlNodesBySchemaOrder(
      elements,
      (name) => name,
      R_PR_CHILD_ORDER,
    );
    expect(sorted).toEqual(["w:rStyle", "w:b", "w:color", "w:sz"]);
  });
});
