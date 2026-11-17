import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const report=JSON.parse(readFileSync(process.argv[2],"utf8"));
assert.deepEqual(report.files.map(f=>f.file).sort(),["date-field.docx","equation.docx","header-footer.docx","image.docx","numbering.docx","property-revisions.docx","threaded-comments.docx"]);
for(const f of report.files){
  console.log(f.file+": "+f.issues.length+" diagnostics");
  for(const issue of f.issues)console.log("  ",issue.code,issue.part,issue.path,issue.message);
}
console.log("Extended characterization: "+report.errors+" diagnostics; not a zero-error certification.");
assert.ok(!report.files.some(f=>f.issues.some(i=>i.code==="PACKAGE_OPEN_ERROR")),"All extended packages must open");
