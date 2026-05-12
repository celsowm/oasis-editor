// Script para analisar estilos do DOCX
import JSZip from "jszip";
import fs from "fs";

async function analyzeDocx() {
  const buffer = fs.readFileSync("lorem_ipsum_complex_document.docx");
  const zip = await JSZip.loadAsync(buffer);
  
  const stylesXml = zip.file("word/styles.xml");
  if (!stylesXml) {
    console.log("Styles.xml not found");
    return;
  }
  
  const stylesContent = await stylesXml.async("text");
  console.log("=== STYLES.XML (excerpt) ===");
  
  // Extract relevant parts about Normal style and paragraph spacing/indent
  const normalMatch = stylesContent.match(/<w:style[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<\/w:style>/);
  if (normalMatch) {
    console.log("\n=== Normal Style ===");
    console.log(normalMatch[0]);
  }
  
  // Extract pPrDefault
  const pPrDefaultMatch = stylesContent.match(/<w:docDefaults>[\s\S]*?<w:pPrDefault>[\s\S]*?<\/w:pPrDefault>[\s\S]*?<\/w:docDefaults>/);
  if (pPrDefaultMatch) {
    console.log("\n=== pPrDefault ===");
    console.log(pPrDefaultMatch[0]);
  }
  
  // Extract all spacing and indent elements
  const spacingMatches = [...stylesContent.matchAll(/<w:spacing[^>]*\/>/g)];
  console.log("\n=== All Spacing Elements ===");
  spacingMatches.forEach(m => console.log(m[0]));
  
  const indentMatches = [...stylesContent.matchAll(/<w:ind[^>]*\/>/g)];
  console.log("\n=== All Indent Elements ===");
  indentMatches.forEach(m => console.log(m[0]));
}

analyzeDocx().catch(console.error);
