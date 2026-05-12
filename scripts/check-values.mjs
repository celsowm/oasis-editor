// Verificar valores convertidos
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;

function twipsToPx(value) {
  const parsed = value ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed / TWIPS_PER_INCH) * PX_PER_INCH);
}

console.log("=== Valores do DOCX convertidos ===\n");
console.log("firstLine='432' twips:", twipsToPx("432"), "px");
console.log("after='160' twips:", twipsToPx("160"), "px");
console.log("\n=== Nossos valores default ===\n");
console.log("indentFirstLine: 0px (deveria ser ~29px)");
console.log("spacingAfter: 8px (deveria ser ~11px)");
console.log("\n=== Diferenças ===\n");
console.log("indentFirstLine: diferença de", twipsToPx("432") - 0, "px");
console.log("spacingAfter: diferença de", twipsToPx("160") - 8, "px");
