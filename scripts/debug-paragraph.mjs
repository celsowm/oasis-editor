// Debug: simular importação de um parágrafo específico
import { readFileSync } from "fs";
import JSZip from "jszip";
import { DOMParser } from "@xmldom/xmldom";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;

function twipsToPx(value) {
  const parsed = value ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed / TWIPS_PER_INCH) * PX_PER_INCH);
}

async function debugParagraph() {
  const buffer = readFileSync("lorem_ipsum_complex_document.docx");
  const zip = await JSZip.loadAsync(buffer);
  
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!docXml) {
    console.log("document.xml not found");
    return;
  }
  
  const document = new DOMParser().parseFromString(docXml, "application/xml");
  
  // Pegar o segundo parágrafo (primeiro com formatação)
  const paragraphs = document.getElementsByTagNameNS(WORD_NS, "p");
  const secondP = paragraphs[1]; // Índice 1 = segundo parágrafo
  
  console.log("=== Segundo parágrafo (primeiro com indentação) ===\n");
  
  // Extrair pPr
  const pPrElements = secondP.getElementsByTagNameNS(WORD_NS, "pPr");
  if (pPrElements.length > 0) {
    const pPr = pPrElements[0];
    
    // Spacing
    const spacingElements = pPr.getElementsByTagNameNS(WORD_NS, "spacing");
    if (spacingElements.length > 0) {
      const spacing = spacingElements[0];
      const after = spacing.getAttribute("w:after");
      const before = spacing.getAttribute("w:before");
      console.log("Spacing:");
      console.log(`  after: ${after} twips = ${twipsToPx(after)}px`);
      console.log(`  before: ${before || 'não definido'}`);
    }
    
    // Indent
    const indentElements = pPr.getElementsByTagNameNS(WORD_NS, "ind");
    if (indentElements.length > 0) {
      const indent = indentElements[0];
      const left = indent.getAttribute("w:left");
      const right = indent.getAttribute("w:right");
      const firstLine = indent.getAttribute("w:firstLine");
      const hanging = indent.getAttribute("w:hanging");
      console.log("\nIndent:");
      console.log(`  left: ${left || 'não definido'}`);
      console.log(`  right: ${right || 'não definido'}`);
      console.log(`  firstLine: ${firstLine} twips = ${twipsToPx(firstLine)}px`);
      console.log(`  hanging: ${hanging || 'não definido'}`);
    }
    
    // StyleId
    const styleIdElements = pPr.getElementsByTagNameNS(WORD_NS, "pStyle");
    if (styleIdElements.length > 0) {
      const styleId = styleIdElements[0].getAttribute("w:val");
      console.log(`\nStyleId: ${styleId}`);
    } else {
      console.log("\nStyleId: não definido (usando estilo padrão)");
    }
  } else {
    console.log("pPr não encontrado");
  }
  
  // Verificar texto do parágrafo
  const textElements = secondP.getElementsByTagNameNS(WORD_NS, "t");
  if (textElements.length > 0) {
    const text = textElements[0].textContent;
    console.log("\nTexto (primeiros 100 chars):");
    console.log(text.substring(0, 100) + "...");
  }
}

debugParagraph().catch(console.error);
