import { DocumentModel } from "../../../core/document/DocumentTypes.js";
import { Relationship } from "../OPCGraphBuilder.js";
import { XMLBuilder } from "../XMLBuilder.js";
import {
  MAIN_NS_DECL,
  resetRelIdCounter,
  resetBookmarkCounter,
  nextRelId,
} from "./WmlConstants.js";
import { RunWriter } from "./RunWriter.js";
import { BlockWriter } from "./BlockWriter.js";
import { SectPrWriter } from "./SectPrWriter.js";
import { NotesWriter } from "./NotesWriter.js";
import { CommentsWriter } from "./CommentsWriter.js";
import { HeaderFooterWriter } from "./HeaderFooterWriter.js";

export interface WMLResult {
  xml: Uint8Array;
  relationships: Relationship[];
  imageParts: Map<string, { contentType: string; data: Uint8Array }>;
  footnotesXml?: Uint8Array;
  endnotesXml?: Uint8Array;
  commentsXml?: Uint8Array;
  headerXml?: Uint8Array;
  footerXml?: Uint8Array;
}

export class WMLWriter {
  private runWriter = new RunWriter();
  private blockWriter = new BlockWriter(this.runWriter);
  private sectPrWriter = new SectPrWriter();
  private notesWriter = new NotesWriter(this.blockWriter);
  private commentsWriter = new CommentsWriter(this.blockWriter);
  private headerFooterWriter = new HeaderFooterWriter(this.blockWriter);

  write(document: DocumentModel): WMLResult {
    resetRelIdCounter();
    resetBookmarkCounter();
    const relationships: Relationship[] = [];
    const imageParts = new Map<string, { contentType: string; data: Uint8Array }>();

    // Pre-generate header/footer XML and relationship IDs
    let headerRelId: string | undefined;
    let footerRelId: string | undefined;
    let headerXml: Uint8Array | undefined;
    let footerXml: Uint8Array | undefined;

    for (const section of document.sections) {
      if (section.header && section.header.length > 0 && !headerRelId) {
        headerRelId = nextRelId();
        headerXml = this.headerFooterWriter.writeHeaderFooter(section.header, "hdr", headerRelId, relationships, imageParts);
      }
      if (section.footer && section.footer.length > 0 && !footerRelId) {
        footerRelId = nextRelId();
        footerXml = this.headerFooterWriter.writeHeaderFooter(section.footer, "ftr", footerRelId, relationships, imageParts);
      }
    }

    const b = new XMLBuilder();
    b.declaration();
    b.raw(`<w:document mc:Ignorable="w14 w15 wp14" ${MAIN_NS_DECL.join(" ")}>`);
    b.open("w", "body");

    for (const section of document.sections) {
      for (const block of section.children) {
        this.blockWriter.writeBlock(b, block, relationships, imageParts);
      }
      this.sectPrWriter.writeSectPr(b, section, document.metadata, headerRelId, footerRelId);
    }

    b.close("w", "body");
    b.close("w", "document");

    const result: WMLResult = { xml: b.toBuffer(), relationships, imageParts };

    if (document.footnotes && document.footnotes.length > 0) {
      result.footnotesXml = this.notesWriter.writeFootnotes(document.footnotes);
    }
    if (document.endnotes && document.endnotes.length > 0) {
      result.endnotesXml = this.notesWriter.writeEndnotes(document.endnotes);
    }
    if (document.comments && document.comments.length > 0) {
      result.commentsXml = this.commentsWriter.writeComments(document.comments);
    }
    if (headerXml) result.headerXml = headerXml;
    if (footerXml) result.footerXml = footerXml;

    return result;
  }
}
