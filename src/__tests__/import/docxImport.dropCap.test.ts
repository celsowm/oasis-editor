import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import JSZip from "jszip";
import { importDocxToEditorDocument } from "../../import/docx/importDocxToEditorDocument.js";
import { exportEditorDocumentToDocx } from "../../export/docx/exportEditorDocumentToDocx.js";
import { parseDropCapFrame } from "../../import/docx/dropCap.js";
import { resolveDropCapExclusion } from "../../layoutProjection/dropCapExclusion.js";
import { getDocumentParagraphs } from "./docxTestHelpers.js";

/** Loads the real `letra_capitular.docx` fixture shipped at the repo root. */
async function loadDropCapDocx(): Promise<ArrayBuffer> {
  const path = resolve(process.cwd(), "letra_capitular.docx");
  const buf = await readFile(path);
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return ab;
}

async function readDocumentXml(docx: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(docx);
  return zip.file("word/document.xml")!.async("string");
}

describe("DOCX import: drop cap (w:framePr/@dropCap)", () => {
  it("attaches the cap to the wrapping body paragraph instead of emitting a giant block", async () => {
    const document = await importDocxToEditorDocument(await loadDropCapDocx());
    const paragraphs = getDocumentParagraphs(document);

    // The frame paragraph holding "L" is not emitted as its own block: the cap
    // letter must not appear as paragraph text anywhere.
    const standaloneCap = paragraphs.find(
      (p) => p.runs.map((r) => r.text).join("") === "L",
    );
    expect(standaloneCap).toBeUndefined();

    // The first content paragraph carries the drop cap and starts with "orem".
    const body = paragraphs.find((p) => p.dropCap);
    expect(body).toBeDefined();
    expect(body!.dropCap!.text).toBe("L");
    expect(body!.dropCap!.lines).toBe(3);
    expect(body!.dropCap!.type).toBe("drop");
    expect(body!.runs.map((r) => r.text).join("")).toContain("orem ipsum");
    // Cap run style survives (w:sz=129 half-points => 64.5pt, w:position=-9).
    expect(body!.dropCap!.style?.fontSize).toBeGreaterThan(60);
  });

  it("round-trips back to a framePr frame paragraph preceding the body", async () => {
    const document = await importDocxToEditorDocument(await loadDropCapDocx());
    const exported = await exportEditorDocumentToDocx(document);
    const xml = await readDocumentXml(exported);

    expect(xml).toContain('w:dropCap="drop"');
    expect(xml).toContain('w:lines="3"');
    expect(xml).toContain('w:wrap="around"');
    // The cap letter and its size/position survive in the frame run.
    expect(xml).toMatch(/<w:framePr w:dropCap="drop"[^>]*\/>/);
    expect(xml).toContain('<w:sz w:val="129"/>');
    expect(xml).toContain('<w:position w:val="-9"/>');

    // Re-importing the exported file yields the same drop cap (idempotent).
    const reimported = await importDocxToEditorDocument(exported);
    const body = getDocumentParagraphs(reimported).find((p) => p.dropCap);
    expect(body?.dropCap?.text).toBe("L");
    expect(body?.dropCap?.lines).toBe(3);
  });
});

describe("parseDropCapFrame", () => {
  it("returns null when framePr has no dropCap attribute", () => {
    expect(parseDropCapFrame(null, [{ text: "x" }])).toBeNull();
  });
});

describe("resolveDropCapExclusion", () => {
  it("produces a square exclusion spanning N body lines at the left edge", () => {
    const exclusion = resolveDropCapExclusion({
      dropCap: { text: "L", lines: 3, type: "drop", style: { fontSize: 86 } },
      bodyLineHeight: 20,
    });
    expect(exclusion).not.toBeNull();
    expect(exclusion!.x).toBe(0);
    expect(exclusion!.y).toBe(0);
    expect(exclusion!.height).toBe(60);
    expect(exclusion!.width).toBeGreaterThan(0);
    expect(exclusion!.wrap).toBe("square");
  });

  it("places a margin cap to the left of the text column (negative x)", () => {
    const exclusion = resolveDropCapExclusion({
      dropCap: { text: "L", lines: 3, type: "margin", style: { fontSize: 86 } },
      bodyLineHeight: 20,
    });
    expect(exclusion!.x).toBeLessThan(0);
  });
});
