// Script para extrair conteúdo de DOCX para análise
// Uso: node scripts/unzip-docx.js [caminho-do-docx] [pasta-destino]
// Exemplo: node scripts/unzip-docx.js documento.docx output/documento

import JSZip from "jszip";
import fs from "fs";
import path from "path";

function getArgOrDefault(argIndex, defaultValue) {
  const arg = process.argv[2 + argIndex];
  return arg || defaultValue;
}

async function unzipDocx(docxPath, outputDir) {
  // Verificar se arquivo existe
  if (!fs.existsSync(docxPath)) {
    console.error(`❌ Arquivo não encontrado: ${docxPath}`);
    process.exit(1);
  }

  // Ler arquivo
  console.log(`📦 Lendo DOCX: ${docxPath}`);
  const buffer = fs.readFileSync(docxPath);
  
  // Carregar ZIP
  const zip = await JSZip.loadAsync(buffer);
  
  // Criar pasta de saída
  const destPath = path.resolve(outputDir);
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }
  
  // Extrair todos os arquivos
  console.log(`📂 Extraindo para: ${destPath}`);
  let fileCount = 0;
  
  for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
    if (zipEntry.dir) continue;
    
    const fullPath = path.join(destPath, relativePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const content = await zipEntry.async("nodebuffer");
    fs.writeFileSync(fullPath, content);
    fileCount++;
  }
  
  console.log(`✅ Extraído com sucesso!`);
  console.log(`   📄 ${fileCount} arquivos extraídos`);
  console.log(`   📁 Pasta: ${destPath}`);
  
  // Listar arquivos importantes para análise
  const importantFiles = [
    "word/document.xml",
    "word/styles.xml",
    "word/numbering.xml",
    "word/settings.xml",
    "word/fontTable.xml",
    "docProps/core.xml",
    "[Content_Types].xml",
  ];
  
  console.log("\n Arquivos importantes:");
  for (const file of importantFiles) {
    const filePath = path.join(destPath, file);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(1);
      console.log(`   ✓ ${file} (${sizeKB} KB)`);
    } else {
      console.log(`   ✗ ${file} (não encontrado)`);
    }
  }
}

// CLI
const docxPath = getArgOrDefault(0, "documento.docx");
const outputDir = getArgOrDefault(1, "output/docx-extracted");

console.log("🔧 DOCX Extractor\n");
console.log(`   Entrada: ${docxPath}`);
console.log(`   Saída: ${outputDir}\n`);

unzipDocx(docxPath, outputDir).catch((error) => {
  console.error("❌ Erro:", error.message);
  process.exit(1);
});
