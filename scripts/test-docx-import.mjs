// Testar importação real do DOCX e ver valores importados
import { readFileSync } from "fs";
import JSZip from "jszip";

// Importar a função de importação
async function testImport() {
  const buffer = readFileSync("lorem_ipsum_complex_document.docx");
  const zip = await JSZip.loadAsync(buffer);
  
  // Extrair XML principal
  const docXml = await zip.file("word/document.xml")?.async("text");
  if (!docXml) {
    console.log("document.xml not found");
    return;
  }
  
  // Procurar parágrafos de corpo com seus estilos
  const pPrMatches = [...docXml.matchAll(/<w:pPr>[\s\S]*?<\/w:pPr>/g)];
  
  console.log("=== Primeiros 5 parágrafos com pPr ===\n");
  for (let i = 0; i < Math.min(5, pPrMatches.length); i++) {
    const pPr = pPrMatches[i][0];
    
    // Extrair styleId
    const styleIdMatch = pPr.match(/w:styleId="([^"]+)"/);
    const styleId = styleIdMatch ? styleIdMatch[1] : "none";
    
    // Extrair spacing
    const spacingMatch = pPr.match(/<w:spacing([^>]*)\/>/);
    const spacing = spacingMatch ? spacingMatch[1] : "none";
    
    // Extrair indent
    const indentMatch = pPr.match(/<w:ind([^>]*)\/>/);
    const indent = indentMatch ? indentMatch[1] : "none";
    
    console.log(`Parágrafo ${i + 1}:`);
    console.log(`  StyleId: ${styleId}`);
    console.log(`  Spacing: ${spacing}`);
    console.log(`  Indent: ${indent}`);
    console.log();
  }
  
  // Verificar se há pPr nos parágrafos de texto
  const paragraphs = [...docXml.matchAll(/<w:p>[\s\S]*?<\/w:p>/g)];
  console.log(`\nTotal de parágrafos: ${paragraphs.length}`);
  
  // Contar quantos têm pPr com indent
  let withIndent = 0;
  let withSpacing = 0;
  let withStyleId = 0;
  
  paragraphs.forEach(p => {
    const pPr = p[0].match(/<w:pPr>[\s\S]*?<\/w:pPr>/);
    if (pPr) {
      if (pPr[0].includes('w:ind')) withIndent++;
      if (pPr[0].includes('w:spacing')) withSpacing++;
      if (pPr[0].includes('w:styleId')) withStyleId++;
    }
  });
  
  console.log(`\nParágrafos com:`);
  console.log(`  Indent: ${withIndent}`);
  console.log(`  Spacing: ${withSpacing}`);
  console.log(`  StyleId: ${withStyleId}`);
}

testImport().catch(console.error);
