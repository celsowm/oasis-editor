// @ts-nocheck








import { describe, it, expect } from "vitest";
import { createDocument } from "../core/document/DocumentFactory.js";

describe("DocumentFactory", () => {
  it("should create a basic document", () => {
    const doc = createDocument();
    expect(doc).toBeDefined();
    expect(doc.sections.length).toBeGreaterThan(0);
  });
});
