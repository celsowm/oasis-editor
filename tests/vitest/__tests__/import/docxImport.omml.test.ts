import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";
import { describe, expect, it } from "vitest";
import { parseMathExpression } from "@/import/docx/math.js";
import { serializeMathExpression } from "@/export/docx/text/mathXml.js";
import { parseLinearMath, serializeLinearMath } from "@/core/math/linear.js";
import { importDocxToEditorDocument } from "@/import/docx/importDocxToEditorDocument.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";

const MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math";

describe("OMML", () => {
  it("parses and serializes common structures", () => {
    const xml = `<m:oMath xmlns:m="${MATH_NS}"><m:f><m:num><m:r><m:t>a</m:t></m:r></m:num><m:den><m:r><m:t>b</m:t></m:r></m:den></m:f><m:sSup><m:e><m:r><m:t>x</m:t></m:r></m:e><m:sup><m:r><m:t>2</m:t></m:r></m:sup></m:sSup></m:oMath>`;
    const element = new DOMParser().parseFromString(xml, "text/xml").documentElement!;
    const expression = parseMathExpression(element);
    expect(expression.children.map((node) => node.kind)).toEqual(["fraction", "script"]);
    expect(serializeMathExpression(expression)).toContain("<m:f>");
    expect(serializeMathExpression(expression)).toContain("<m:sSup>");
  });

  it("keeps unsupported OMML nodes for round-trip", () => {
    const xml = `<m:oMath xmlns:m="${MATH_NS}"><m:custom future="1"><m:r><m:t>z</m:t></m:r></m:custom></m:oMath>`;
    const expression = parseMathExpression(
      new DOMParser().parseFromString(xml, "text/xml").documentElement!,
    );
    expect(expression.children[0]).toMatchObject({ kind: "raw", fallbackText: "z" });
    expect(serializeMathExpression(expression)).toContain("future=\"1\"");
  });

  it("supports linear fraction, radical and scripts", () => {
    const expression = parseLinearMath("\\frac{a}{\\sqrt{x}}+x^{2}");
    expect(serializeLinearMath(expression)).toBe("\\frac{a}{\\sqrt{x}}+x^{2}");
  });

  it("imports an OMML paragraph as an inline math atom", async () => {
    const zip = new JSZip();
    zip.file(
      "word/document.xml",
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="${MATH_NS}"><w:body><w:p><w:r><w:t>A</w:t></w:r><m:oMathPara><m:oMath><m:r><m:t>x</m:t></m:r></m:oMath></m:oMathPara><w:r><w:t>B</w:t></w:r></w:p><w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`,
    );
    const document = await importDocxToEditorDocument(
      await zip.generateAsync({ type: "arraybuffer" }),
    );
    const runs = getDocumentParagraphs(document)[0]!.runs;
    expect(runs.map((run) => run.kind)).toEqual(["text", "math", "text"]);
    expect(runs[1]).toMatchObject({ kind: "math", text: "\uFFFC" });
  });
});
