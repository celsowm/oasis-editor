import { describe, expect, it } from "vitest";
import type {
  EditorDocxSourcePackage,
  EditorSdtBlockWrapper,
} from "@/core/model.js";
import {
  createEditorDocument,
  createEditorParagraphFromRuns,
} from "@/core/editorState.js";
import { synchronizeBoundContentControls } from "@/export/docx/synchronizeBoundContentControls.js";
import { resolveCustomXmlBinding } from "@/ooxml/word/customXmlBinding.js";

function buildSourcePackage(): EditorDocxSourcePackage {
  return {
    format: "docx",
    mainDocumentPart: "word/document.xml",
    contentTypes: { defaults: {}, overrides: {} },
    rootRelationships: [],
    parts: {
      "customXml/item1.xml": {
        path: "customXml/item1.xml",
        kind: "xml",
        data: '<root xmlns="urn:test"><name>Alice</name></root>',
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
        data: '<ds:datastoreItem xmlns:ds="http://schemas.openxmlformats.org/officeDocument/2006/customXml" ds:itemID="{STORE-1}"/>',
        encoding: "utf8",
        originalHash: "props",
      },
    },
  };
}

function bindingWrapper(groupId: string): EditorSdtBlockWrapper {
  return {
    groupId,
    sdtPr: {
      tag: "customer-name",
      subtype: { kind: "text" },
      dataBinding: {
        storeItemID: "{STORE-1}",
        prefixMappings: 'xmlns:t="urn:test"',
        xpath: "/t:root/t:name",
      },
    },
  };
}

describe("synchronizeBoundContentControls", () => {
  it("writes edited block SDT text into its bound custom XML leaf", () => {
    const paragraph = createEditorParagraphFromRuns([{ text: "Bob" }]);
    paragraph.sdtWrappers = [bindingWrapper("sdt:1")];
    const document = createEditorDocument([paragraph]);
    document.sourcePackage = buildSourcePackage();

    expect(synchronizeBoundContentControls(document)).toBe(1);
    expect(
      resolveCustomXmlBinding(
        document.sourcePackage,
        paragraph.sdtWrappers[0]!.sdtPr.dataBinding,
      )?.value,
    ).toBe("Bob");
  });

  it("concatenates edited inline SDT runs into the bound custom XML leaf", () => {
    const paragraph = createEditorParagraphFromRuns([
      { text: "Ali" },
      { text: "cia" },
    ]);
    const wrapper = bindingWrapper("sdt:inline");
    paragraph.runs[0]!.sdtWrappers = [wrapper];
    paragraph.runs[1]!.sdtWrappers = [wrapper];
    const document = createEditorDocument([paragraph]);
    document.sourcePackage = buildSourcePackage();

    expect(synchronizeBoundContentControls(document)).toBe(1);
    expect(
      resolveCustomXmlBinding(
        document.sourcePackage,
        wrapper.sdtPr.dataBinding,
      )?.value,
    ).toBe("Alicia");
  });

  it("does not count unresolved bindings", () => {
    const paragraph = createEditorParagraphFromRuns([{ text: "Bob" }]);
    paragraph.sdtWrappers = [
      {
        groupId: "sdt:1",
        sdtPr: {
          dataBinding: {
            storeItemID: "{MISSING}",
            prefixMappings: 'xmlns:t="urn:test"',
            xpath: "/t:root/t:name",
          },
        },
      },
    ];
    const document = createEditorDocument([paragraph]);
    document.sourcePackage = buildSourcePackage();

    expect(synchronizeBoundContentControls(document)).toBe(0);
  });
});
