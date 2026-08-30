import { describe, it, expect } from "vitest";
import { CustomXmlDataStore } from "../../ooxml/customXmlEngine.js";

describe("CustomXmlEngine", () => {
  it("evaluates XPath queries against registered custom XML items", () => {
    const store = new CustomXmlDataStore();
    const xml = `<root xmlns:ns="http://example.com/ns"><ns:customer><ns:name>John Doe</ns:name></ns:customer></root>`;
    store.registerItem("{11111111-2222-3333-4444-555555555555}", "customXml/item1.xml", xml);

    const value = store.evaluateXPath({
      storeItemID: "{11111111-2222-3333-4444-555555555555}",
      xpath: "/root/ns:customer/ns:name",
    });

    expect(value).toBe("John Doe");
  });

  it("updates custom XML DOM nodes when updating XPath values", () => {
    const store = new CustomXmlDataStore();
    const xml = `<root><title>Old Title</title></root>`;
    store.registerItem("{ITEM-ID}", "customXml/item1.xml", xml);

    const binding = { storeItemID: "{ITEM-ID}", xpath: "/root/title" };
    const success = store.updateXPathValue(binding, "New Title");

    expect(success).toBe(true);
    expect(store.evaluateXPath(binding)).toBe("New Title");
    expect(store.serializeItem("{ITEM-ID}")).toContain("<title>New Title</title>");
  });
});
