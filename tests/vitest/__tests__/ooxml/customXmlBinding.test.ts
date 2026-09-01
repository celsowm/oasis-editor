import { describe, expect, it } from "vitest";
import type { EditorDocxSourcePackage } from "@/core/model.js";
import {
  resolveCustomXmlBinding,
  writeCustomXmlBinding,
} from "@/ooxml/word/customXmlBinding.js";

function sourcePackage(): EditorDocxSourcePackage {
  return {
    format: "docx",
    mainDocumentPart: "word/document.xml",
    contentTypes: { defaults: {}, overrides: {} },
    rootRelationships: [],
    parts: {
      "customXml/item1.xml": {
        path: "customXml/item1.xml",
        kind: "xml",
        data: '<root xmlns="urn:test" xmlns:m="urn:meta"><customer><name>Alice</name><code value="42" m:state="open"/></customer></root>',
        encoding: "utf8",
        originalHash: "item",
        relationships: [
          {
            id: "rId1",
            type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/customXmlProps",
            target: "itemProps1.xml",
            resolvedTarget: "customXml/itemProps1.xml",
          },
        ],
      },
      "customXml/itemProps1.xml": {
        path: "customXml/itemProps1.xml",
        kind: "xml",
        data: '<ds:datastoreItem xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml" ds:itemID="{A1B2-C3D4}"/>',
        encoding: "utf8",
        originalHash: "props",
      },
    },
  };
}

describe("custom XML data bindings", () => {
  it("resolves a namespaced element value through storeItemID", () => {
    const resolved = resolveCustomXmlBinding(sourcePackage(), {
      storeItemID: "a1b2-c3d4",
      prefixMappings: 'xmlns:t="urn:test"',
      xpath: "/t:root/t:customer/t:name",
    });

    expect(resolved).toMatchObject({
      storeItemId: "{A1B2-C3D4}",
      itemPartPath: "customXml/item1.xml",
      itemPropsPartPath: "customXml/itemProps1.xml",
      value: "Alice",
      kind: "element",
    });
  });

  it("resolves attributes and indexed child steps", () => {
    const resolved = resolveCustomXmlBinding(sourcePackage(), {
      storeItemID: "{A1B2-C3D4}",
      prefixMappings: "xmlns:t='urn:test'",
      xpath: "/t:root/t:customer[1]/t:code/@value",
    });

    expect(resolved?.value).toBe("42");
    expect(resolved?.kind).toBe("attribute");
  });

  it("writes leaf element values back into the source package", () => {
    const source = sourcePackage();
    const binding = {
      storeItemID: "{A1B2-C3D4}",
      prefixMappings: 'xmlns:t="urn:test"',
      xpath: "/t:root/t:customer/t:name",
    };

    expect(writeCustomXmlBinding(source, binding, "Bob")).toBe(true);
    expect(resolveCustomXmlBinding(source, binding)?.value).toBe("Bob");
    expect(source.parts["customXml/item1.xml"]!.data).toContain(">Bob<");
  });

  it("writes attribute values back into the source package", () => {
    const source = sourcePackage();
    const binding = {
      storeItemID: "{A1B2-C3D4}",
      prefixMappings: 'xmlns:t="urn:test"',
      xpath: "/t:root/t:customer/t:code/@value",
    };

    expect(writeCustomXmlBinding(source, binding, "99")).toBe(true);
    expect(resolveCustomXmlBinding(source, binding)?.value).toBe("99");
  });

  it("preserves the qualified name of namespaced attributes", () => {
    const source = sourcePackage();
    const binding = {
      storeItemID: "{A1B2-C3D4}",
      prefixMappings: 'xmlns:t="urn:test" xmlns:m="urn:meta"',
      xpath: "/t:root/t:customer/t:code/@m:state",
    };

    expect(writeCustomXmlBinding(source, binding, "closed")).toBe(true);
    expect(resolveCustomXmlBinding(source, binding)?.value).toBe("closed");
    expect(source.parts["customXml/item1.xml"]!.data).toContain(
      'm:state="closed"',
    );
  });

  it("returns null or false for unsupported or broken bindings", () => {
    expect(
      resolveCustomXmlBinding(sourcePackage(), {
        storeItemID: "missing",
        prefixMappings: 'xmlns:t="urn:test"',
        xpath: "/t:root/t:customer/t:name",
      }),
    ).toBeNull();

    expect(
      writeCustomXmlBinding(
        sourcePackage(),
        {
          storeItemID: "{A1B2-C3D4}",
          prefixMappings: 'xmlns:t="urn:test"',
          xpath: "//t:name",
        },
        "Bob",
      ),
    ).toBe(false);
  });
});
