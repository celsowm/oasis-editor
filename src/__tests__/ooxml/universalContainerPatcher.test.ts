import { describe, it, expect } from "vitest";
import { preserveNamespacesAndMc } from "../../export/docx/opc/universalContainerPatcher.js";

describe("UniversalContainerPatcher", () => {
  it("preserves missing mc attributes and namespaces from source XML to rebuilt XML", () => {
    const sourceXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" mc:Ignorable="w14" mc:PreserveElements="w14:paraId"><w:body/></w:document>`;
    const rebuiltXml = `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p/></w:body></w:document>`;

    const patched = preserveNamespacesAndMc(sourceXml, rebuiltXml);

    expect(patched).toContain('mc:Ignorable="w14"');
    expect(patched).toContain('mc:PreserveElements="w14:paraId"');
  });
});
