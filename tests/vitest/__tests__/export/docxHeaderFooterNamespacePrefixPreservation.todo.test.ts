import { describe, expect, it } from "vitest";
import { DOMParser } from "@xmldom/xmldom";
import JSZip from "jszip";
import { importDocxInWorker } from "@/import/docx/importDocxInWorker.js";
import { exportEditorDocumentToDocxPreservingSource } from "@/export/docx/exportEditorDocumentToDocxPreservingSource.js";
import { collectHeaderFooterStoryReferences } from "@/export/docx/opc/headerFooterStoryReferences.js";

const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const R="http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const P="http://schemas.openxmlformats.org/package/2006/relationships";
const CT="http://schemas.openxmlformats.org/package/2006/content-types";
const MC="http://schemas.openxmlformats.org/markup-compatibility/2006";
const EXT="urn:oasis:test:future";
const relationships=(items: Array<[string,string,string]>)=>`<Relationships xmlns="${P}">${items.map(([id,type,target])=>`<Relationship Id="${id}" Type="${R}/${type}" Target="${target}"/>`).join("")}</Relationships>`;

async function fixture(){
  const zip=new JSZip();
  zip.file("[Content_Types].xml",`<Types xmlns="${CT}"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/header42.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/><Override PartName="/word/footer73.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>`);
  zip.file("_rels/.rels",relationships([["rIdOffice","officeDocument","word/document.xml"]]));
  zip.file("word/_rels/document.xml.rels",relationships([["rIdSourceHeader","header","header42.xml"],["rIdSourceFooter","footer","footer73.xml"],["rIdSourceCustom","customXml","../customXml/item42.xml"]]));
  zip.file("word/document.xml",`<wx:document xmlns:wx="${W}" xmlns:rel="${R}" xmlns:compat="${MC}" xmlns:future="${EXT}" compat:Ignorable="future"><wx:body><wx:p><wx:r><wx:t>Body original</wx:t></wx:r></wx:p><wx:sectPr><wx:headerReference future:id="foreign-id" future:type="first" wx:type="default" rel:id="rIdSourceHeader"/><wx:footerReference wx:type="default" rel:id="rIdSourceFooter"/><wx:pgSz wx:w="12240" wx:h="15840"/><wx:pgMar wx:top="1440" wx:right="1440" wx:bottom="1440" wx:left="1440" wx:header="720" wx:footer="720" wx:gutter="0"/></wx:sectPr></wx:body></wx:document>`);
  zip.file("word/header42.xml",`<wx:hdr xmlns:wx="${W}" xmlns:compat="${MC}" xmlns:future="${EXT}" compat:Ignorable="future" future:marker="root"><future:sentinel future:value="keep"/><wx:p><wx:r><wx:t>Original header</wx:t></wx:r></wx:p></wx:hdr>`);
  zip.file("word/footer73.xml",`<wx:ftr xmlns:wx="${W}"><wx:p><wx:r><wx:t>Original footer</wx:t></wx:r></wx:p></wx:ftr>`);
  zip.file("customXml/item42.xml","<data><token>opaque payload</token></data>");
  return zip.generateAsync({type:"arraybuffer"});
}

describe("DOCX namespace-prefix independence",()=>{
  it("preserves noncanonical story references, ignored extensions and unrelated parts across three production round trips",async()=>{
    let bytes=await fixture();
    for(let cycle=0;cycle<3;cycle++){
      const document=await importDocxInWorker(bytes);
      const section=document.sections?.[0];
      const main=section?.blocks[0],header=section?.header?.[0],footer=section?.footer?.[0];
      if(main?.type!=="paragraph"||header?.type!=="paragraph"||footer?.type!=="paragraph")throw Error("Expected body/header/footer paragraphs");
      expect(header.runs.map(r=>r.text).join("")).toBe(cycle===0?"Original header":"Header edit "+(cycle-1));
      expect(footer.runs.map(r=>r.text).join("")).toBe("Original footer");
      main.runs[0]!.text="Body edit "+cycle;
      header.runs[0]!.text="Header edit "+cycle;
      bytes=await exportEditorDocumentToDocxPreservingSource(document);
      const zip=await JSZip.loadAsync(bytes);
      const mainXml=await zip.file("word/document.xml")!.async("string");
      const refs=collectHeaderFooterStoryReferences(mainXml);
      expect(refs.map(r=>[r.kind,r.type,r.relationshipId])).toEqual([["header","default","rIdSourceHeader"],["footer","default","rIdSourceFooter"]]);
      const headerXml=await zip.file("word/header42.xml")!.async("string");
      const xml=new DOMParser().parseFromString(headerXml,"application/xml");
      expect(xml.documentElement?.getAttributeNS(EXT,"marker")).toBe("root");
      expect(xml.getElementsByTagNameNS(EXT,"sentinel").length).toBe(1);
      expect(xml.getElementsByTagNameNS(EXT,"sentinel").item(0)?.getAttributeNS(EXT,"value")).toBe("keep");
      expect(Array.from(xml.getElementsByTagNameNS(W,"t")).map(t=>t.textContent).join("")).toBe("Header edit "+cycle);
      expect(await zip.file("word/footer73.xml")!.async("string")).toContain("Original footer");
      expect(await zip.file("customXml/item42.xml")!.async("string")).toBe("<data><token>opaque payload</token></data>");
      expect(zip.file("word/header1.xml")).toBeNull();
      expect(zip.file("word/footer1.xml")).toBeNull();
      const rels=await zip.file("word/_rels/document.xml.rels")!.async("string");
      expect(rels).toContain('Target="header42.xml"');
      expect(rels).toContain('Target="footer73.xml"');
    }
  },30000);
});
