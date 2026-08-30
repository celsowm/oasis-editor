import { describe, it, expect } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import { extractMarkupCompatibilityMetadata, serializeMcAttributes } from "../../ooxml/markupCompatibilityEngine.js";

describe("MarkupCompatibilityEngine", () => {
  it("extracts and serializes mc attributes accurately", () => {
    const xml = `<w:p xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="w14 w15" mc:PreserveElements="w14:paraId">
      <mc:AlternateContent>
        <mc:Choice Requires="w14"><w:r><w:t>Choice</w:t></w:r></mc:Choice>
        <mc:Fallback><w:r><w:t>Fallback</w:t></w:r></mc:Fallback>
      </mc:AlternateContent>
    </w:p>`;

    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const element = doc.documentElement!;
    const metadata = extractMarkupCompatibilityMetadata(element);

    expect(metadata.ignorable).toBe("w14 w15");
    expect(metadata.preserveElements).toBe("w14:paraId");
    expect(metadata.alternateContentBlocks.length).toBe(1);
    expect(metadata.alternateContentBlocks[0]).toContain("mc:AlternateContent");

    const serializedAttrs = serializeMcAttributes(metadata);
    expect(serializedAttrs).toContain('mc:Ignorable="w14 w15"');
    expect(serializedAttrs).toContain('mc:PreserveElements="w14:paraId"');
  });
});
