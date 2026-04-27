import JSZip from "jszip";
import { XMLBuilder } from "./XMLBuilder.js";
import { Relationship } from "./OPCGraphBuilder.js";
import { pxToHalfPoint } from "../../core/utils/Units.js";
import { IFontManager } from "../../core/typography/FontManager.js";
import { DocumentModel } from "../../core/document/DocumentTypes.js";
import { WMLResult } from "./writing/WmlWriter.js";

const CT_NS = "http://schemas.openxmlformats.org/package/2006/content-types";
const RELS_NS = "http://schemas.openxmlformats.org/package/2006/relationships";
const OFFICE_DOC_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument";
const NUMBERING_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering";
const STYLES_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles";
const FOOTNOTES_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes";
const ENDNOTES_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes";
const COMMENTS_REL =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments";

export interface OPCPartEntry {
  name: string;
  contentType: string;
  content: Uint8Array;
}

export class OPCPackageWriter {
  private fontManager: IFontManager;

  constructor(fontManager: IFontManager) {
    this.fontManager = fontManager;
  }

  async write(doc: DocumentModel, result: WMLResult): Promise<Uint8Array> {
    const parts = this.build(
        result.xml,
        result.relationships,
        result.imageParts,
        result.footnotesXml,
        result.endnotesXml,
        result.commentsXml,
        result.headerXml,
        result.footerXml
    );

    const zip = new JSZip();
    for (const [path, entry] of parts) {
      zip.file(path, entry.content);
    }
    return zip.generateAsync({ type: "uint8array" });
  }

  build(
    documentXml: Uint8Array,
    docRelationships: Relationship[],
    imageParts: Map<string, { contentType: string; data: Uint8Array }>,
    footnotesXml?: Uint8Array,
    endnotesXml?: Uint8Array,
    commentsXml?: Uint8Array,
    headerXml?: Uint8Array,
    footerXml?: Uint8Array,
  ): Map<string, OPCPartEntry> {
    const parts = new Map<string, OPCPartEntry>();

    // Build numbering.xml (we always include it for list support)
    const numberingXml = this.buildNumberingXml();
    parts.set("word/numbering.xml", {
      name: "word/numbering.xml",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml",
      content: numberingXml,
    });

    // Build styles.xml (minimal)
    const stylesXml = this.buildStylesXml();
    parts.set("word/styles.xml", {
      name: "word/styles.xml",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml",
      content: stylesXml,
    });

    // Document relationships
    const docRels: Relationship[] = [
      ...docRelationships,
      {
        id: `rIdN${docRelationships.length + 1}`,
        type: NUMBERING_REL,
        target: "numbering.xml",
      },
      {
        id: `rIdS${docRelationships.length + 2}`,
        type: STYLES_REL,
        target: "styles.xml",
      },
    ];

    let nextRelId = docRelationships.length + 3;

    if (footnotesXml) {
      parts.set("word/footnotes.xml", {
        name: "word/footnotes.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.footnotes+xml",
        content: footnotesXml,
      });
      docRels.push({
        id: `rIdF${nextRelId++}`,
        type: FOOTNOTES_REL,
        target: "footnotes.xml",
      });
    }

    if (endnotesXml) {
      parts.set("word/endnotes.xml", {
        name: "word/endnotes.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.endnotes+xml",
        content: endnotesXml,
      });
      docRels.push({
        id: `rIdE${nextRelId++}`,
        type: ENDNOTES_REL,
        target: "endnotes.xml",
      });
    }

    if (commentsXml) {
      parts.set("word/comments.xml", {
        name: "word/comments.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml",
        content: commentsXml,
      });
      docRels.push({
        id: `rIdC${nextRelId++}`,
        type: COMMENTS_REL,
        target: "comments.xml",
      });
    }

    if (headerXml) {
      parts.set("word/hdr1.xml", {
        name: "word/hdr1.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml",
        content: headerXml,
      });
    }

    if (footerXml) {
      parts.set("word/ftr1.xml", {
        name: "word/ftr1.xml",
        contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml",
        content: footerXml,
      });
    }

    // Image parts
    for (const [imageName, imageData] of imageParts) {
      const fullPath = `word/${imageName}`;
      parts.set(fullPath, {
        name: fullPath,
        contentType: imageData.contentType,
        content: imageData.data,
      });
    }

    // Document XML
    parts.set("word/document.xml", {
      name: "word/document.xml",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml",
      content: documentXml,
    });

    // Package relationships
    const packageRels: Relationship[] = [
      {
        id: "rId1",
        type: OFFICE_DOC_REL,
        target: "word/document.xml",
      },
    ];

    parts.set("[Content_Types].xml", {
      name: "[Content_Types].xml",
      contentType: "",
      content: this.buildContentTypes(parts),
    });

    parts.set("_rels/.rels", {
      name: "_rels/.rels",
      contentType: "",
      content: this.buildRelsXml(packageRels),
    });

    parts.set("word/_rels/document.xml.rels", {
      name: "word/_rels/document.xml.rels",
      contentType: "",
      content: this.buildRelsXml(docRels),
    });

    return parts;
  }

  private buildContentTypes(parts: Map<string, OPCPartEntry>): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.open("", "Types", { xmlns: CT_NS });

    // Defaults
    b.selfClose("", "Default", { Extension: "rels", ContentType: "application/vnd.openxmlformats-package.relationships+xml" });
    b.selfClose("", "Default", { Extension: "xml", ContentType: "application/xml" });

    // Image defaults
    const imageExts = new Set<string>();
    for (const part of parts.values()) {
      if (part.contentType.startsWith("image/")) {
        const ext = part.name.split(".").pop()?.toLowerCase();
        if (ext) imageExts.add(ext);
      }
    }
    for (const ext of imageExts) {
      const mime = this.extToMime(ext);
      if (mime) {
        b.selfClose("", "Default", { Extension: ext, ContentType: mime });
      }
    }

    // Overrides for specific parts
    const overrideParts = ["word/document.xml", "word/numbering.xml", "word/styles.xml", "word/footnotes.xml", "word/endnotes.xml", "word/comments.xml", "word/hdr1.xml", "word/ftr1.xml"];
    for (const name of overrideParts) {
      const part = parts.get(name);
      if (part) {
        b.selfClose("", "Override", { PartName: `/${name}`, ContentType: part.contentType });
      }
    }

    b.close("", "Types");
    return b.toBuffer();
  }

  private buildRelsXml(rels: Relationship[]): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.open("", "Relationships", { xmlns: RELS_NS });
    for (const rel of rels) {
      b.selfClose("", "Relationship", {
        Id: rel.id,
        Type: rel.type,
        Target: rel.target,
        ...(rel.targetMode ? { TargetMode: rel.targetMode } : {}),
      });
    }
    b.close("", "Relationships");
    return b.toBuffer();
  }

  private buildNumberingXml(): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.open("w", "numbering", {
      "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    });

    // Abstract nums
    // Bullet abstract num
    b.open("w", "abstractNum", { "w:abstractNumId": "0" });
    for (let i = 0; i < 9; i++) {
      b.open("w", "lvl", { "w:ilvl": i });
      b.selfClose("w", "start", { "w:val": 1 });
      b.selfClose("w", "numFmt", { "w:val": "bullet" });
      b.selfClose("w", "lvlText", { "w:val": ["\u2022", "\u25CB", "\u25AA", "\u2192", "\u2013", "\u203A", "\u2022", "\u25CB", "\u25AA"][i] });
      b.selfClose("w", "lvlJc", { "w:val": "left" });
      b.open("w", "pPr");
      b.open("w", "ind", { "w:left": 720 + i * 360, "w:hanging": 360 });
      b.close("w", "ind");
      b.close("w", "pPr");
      b.close("w", "lvl");
    }
    b.close("w", "abstractNum");

    // Decimal abstract num
    b.open("w", "abstractNum", { "w:abstractNumId": "1" });
    for (let i = 0; i < 9; i++) {
      const formats = ["decimal", "lowerLetter", "lowerRoman", "upperLetter", "upperRoman", "decimal", "lowerLetter", "lowerRoman", "upperLetter"];
      const texts = ["%1.", "%2.", "%3.", "%4.", "%5.", "%6.", "%7.", "%8.", "%9."];
      b.open("w", "lvl", { "w:ilvl": i });
      b.selfClose("w", "start", { "w:val": 1 });
      b.selfClose("w", "numFmt", { "w:val": formats[i] });
      b.selfClose("w", "lvlText", { "w:val": texts[i] });
      b.selfClose("w", "lvlJc", { "w:val": "left" });
      b.open("w", "pPr");
      b.open("w", "ind", { "w:left": 720 + i * 360, "w:hanging": 360 });
      b.close("w", "ind");
      b.close("w", "pPr");
      b.close("w", "lvl");
    }
    b.close("w", "abstractNum");

    // Concrete nums
    b.open("w", "num", { "w:numId": "1" });
    b.selfClose("w", "abstractNumId", { "w:val": "0" });
    b.close("w", "num");

    b.open("w", "num", { "w:numId": "2" });
    b.selfClose("w", "abstractNumId", { "w:val": "1" });
    b.close("w", "num");

    b.close("w", "numbering");
    return b.toBuffer();
  }

  private buildStylesXml(): Uint8Array {
    const b = new XMLBuilder();
    b.declaration();
    b.open("w", "styles", {
      "xmlns:w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main",
    });

    // Default paragraph style
    b.open("w", "style", { "w:type": "paragraph", "w:default": "1", "w:styleId": "Normal" });
    b.open("w", "name", { "w:val": "Normal" });
    b.close("w", "name");
    const normalTypography = this.fontManager.getTypographyForBlock("paragraph");
    b.open("w", "rPr");
    b.selfClose("w", "rFonts", { "w:ascii": normalTypography.fontFamily, "w:hAnsi": normalTypography.fontFamily });
    const normalHalfPoints = pxToHalfPoint(normalTypography.fontSize);
    b.selfClose("w", "sz", { "w:val": normalHalfPoints });
    b.selfClose("w", "szCs", { "w:val": normalHalfPoints });
    b.close("w", "rPr");
    b.close("w", "style");

    // Heading styles
    for (let i = 1; i <= 6; i++) {
      b.open("w", "style", { "w:type": "paragraph", "w:styleId": `Heading${i}` });
      b.open("w", "name", { "w:val": `heading ${i}` });
      b.close("w", "name");
      b.open("w", "basedOn", { "w:val": "Normal" });
      b.close("w", "basedOn");
      b.open("w", "pPr");
      b.open("w", "spacing", { "w:before": 240 * i, "w:after": 120 });
      b.close("w", "spacing");
      b.close("w", "pPr");
      b.open("w", "rPr");
      b.selfClose("w", "b");
      const headingTypography = this.fontManager.getTypographyForBlock("heading");
      const halfPoints = pxToHalfPoint(headingTypography.fontSize);
      b.selfClose("w", "sz", { "w:val": halfPoints });
      b.selfClose("w", "szCs", { "w:val": halfPoints });
      b.selfClose("w", "rFonts", { "w:ascii": headingTypography.fontFamily, "w:hAnsi": headingTypography.fontFamily });
      b.close("w", "rPr");
      b.close("w", "style");
    }

    b.close("w", "styles");
    return b.toBuffer();
  }

  private extToMime(ext: string): string | null {
    const map: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      bmp: "image/bmp",
      svg: "image/svg+xml",
    };
    return map[ext] ?? null;
  }
}
