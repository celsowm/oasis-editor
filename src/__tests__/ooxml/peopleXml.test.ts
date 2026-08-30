import { describe, it, expect } from "vitest";
import { PeopleXmlRegistry } from "../../ooxml/peopleXml.js";

describe("PeopleXmlRegistry", () => {
  it("parses and serializes word/people.xml author identities", () => {
    const registry = new PeopleXmlRegistry();
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <w15:people xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml">
      <w15:person w15:author="Alice" w15:userId="user_123" w15:providerId="AD"/>
    </w15:people>`;

    registry.parsePeopleXml(xml);
    expect(registry.getPerson("Alice")).toEqual({
      author: "Alice",
      userId: "user_123",
      providerId: "AD",
    });

    registry.registerPerson({ author: "Bob", userId: "user_456" });
    const serialized = registry.serializePeopleXml();
    expect(serialized).toContain('w15:author="Alice"');
    expect(serialized).toContain('w15:author="Bob"');
  });
});
