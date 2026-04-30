import JSZip from "jszip";

export async function buildDocx(documentXml: string): Promise<File> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  const buffer = await zip.generateAsync({ type: "arraybuffer" });
  return new File([buffer], "import.docx", {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}

export function createTinyPngFile(name: string): File {
  return new File(
    [
      Uint8Array.from([
        137, 80, 78, 71, 13, 10, 26, 10,
        0, 0, 0, 13, 73, 72, 68, 82,
        0, 0, 0, 1, 0, 0, 0, 1,
        8, 6, 0, 0, 0, 31, 21, 196, 137,
        0, 0, 0, 13, 73, 68, 65, 84,
        120, 218, 99, 252, 255, 159, 161, 30,
        0, 7, 130, 2, 127, 63, 201, 164, 116,
        0, 0, 0, 0, 73, 69, 78, 68,
        174, 66, 96, 130,
      ]),
    ],
    name,
    { type: "image/png" },
  );
}

export function setupOasisEditor2Dom(): void {
  document.body.innerHTML = `
    <div id="oasis-editor-2-root"></div>
    <div id="oasis-editor-2-loading"></div>
  `;
}
