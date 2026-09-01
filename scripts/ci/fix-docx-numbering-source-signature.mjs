import fs from "node:fs";

const path = "src/ooxml/word/sourceFragments.ts";
const content = fs.readFileSync(path, "utf8");
const before = `  return stableSemanticString({\n    style: paragraph.style,\n    list: paragraph.list,\n  });`;
const after = `  return stableSemanticString({\n    style: paragraph.style,\n    list: paragraph.list,\n    numberingRevision: paragraph.numberingRevision,\n  });`;
if (!content.includes(before)) {
  throw new Error("Paragraph properties signature anchor not found");
}
fs.writeFileSync(path, content.replace(before, after));
