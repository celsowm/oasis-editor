import fs from "node:fs";

const path = "src/core/model/index.ts";
const content = fs.readFileSync(path, "utf8");
const before = `  EditorSection,\n  EditorPageNumbering,\n  EditorSectionVerticalAlign,`;
const after = `  EditorSection,\n  EditorSectionBreakType,\n  EditorSectionPropertiesSnapshot,\n  EditorPageNumbering,\n  EditorSectionVerticalAlign,`;
if (!content.includes(before)) {
  throw new Error("Section type export anchor not found");
}
fs.writeFileSync(path, content.replace(before, after));
