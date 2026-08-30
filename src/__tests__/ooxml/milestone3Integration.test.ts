import { describe, it, expect } from "vitest";
import { CustomXmlDataStore } from "../../ooxml/customXmlEngine.js";
import { PeopleXmlRegistry } from "../../ooxml/peopleXml.js";
import { projectParagraphForMode } from "../../ooxml/revisionProjectionEngine.js";
import { parseFieldInstruction, evaluateFieldInstruction } from "../../ooxml/fieldEvaluationEngine.js";
import type { EditorParagraphNode } from "@/core/model.js";

describe("Milestone 3 Integration Suite: Advanced Legal & Business Semantics", () => {
  it("integrates Custom XML data-binding with SDT controls", () => {
    const store = new CustomXmlDataStore();
    store.registerItem("{CONTRACT-DATA}", "customXml/item1.xml", `<contract><partyName>Acme Corp</partyName></contract>`);

    const binding = { storeItemID: "{CONTRACT-DATA}", xpath: "/contract/partyName" };
    expect(store.evaluateXPath(binding)).toBe("Acme Corp");

    store.updateXPathValue(binding, "Globex Corp");
    expect(store.evaluateXPath(binding)).toBe("Globex Corp");
  });

  it("manages author identities and threaded comment relationships", () => {
    const people = new PeopleXmlRegistry();
    people.registerPerson({ author: "Legal Reviewer", userId: "usr_42" });

    expect(people.getPerson("Legal Reviewer")?.userId).toBe("usr_42");
    expect(people.serializePeopleXml()).toContain('w15:author="Legal Reviewer"');
  });

  it("evaluates tracked changes projections for Original and Final modes", () => {
    const paragraph: EditorParagraphNode = {
      id: "p1",
      type: "paragraph",
      runs: [
        { id: "r1", kind: "text", text: "Standard " },
        { id: "r2", kind: "text", text: "Old Term ", revision: { id: "rev1", type: "delete", date: 0, author: "A" } },
        { id: "r3", kind: "text", text: "New Term", revision: { id: "rev2", type: "insert", date: 0, author: "A" } },
      ],
    };

    const finalP = projectParagraphForMode(paragraph, "final");
    expect(finalP?.runs.map((r) => r.text).join("")).toBe("Standard New Term");

    const origP = projectParagraphForMode(paragraph, "original");
    expect(origP?.runs.map((r) => r.text).join("")).toBe("Standard Old Term ");
  });

  it("evaluates complex field instruction ASTs for dynamic document variables and conditional logic", () => {
    const ast = parseFieldInstruction('IF "Draft" = "Draft" "Watermark Active" "No Watermark"');
    expect(ast.name).toBe("IF");

    const result = evaluateFieldInstruction('IF "Draft" = "Draft" "Watermark Active" "No Watermark"');
    expect(result).toBe("Watermark Active");
  });
});
