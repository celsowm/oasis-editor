import {readFileSync} from "node:fs";
import assert from "node:assert/strict";
const report=JSON.parse(readFileSync(process.argv[2],"utf8"));
assert.deepEqual(report.files.map(f=>f.file).sort(),["date-field.docx","equation.docx","header-footer.docx","image.docx","numbering.docx","property-revisions.docx","threaded-comments.docx"]);
for(const f of report.files){
  console.log(f.file+": "+f.issues.length+" diagnostics");
  for(const issue of f.issues)console.log("  ",issue.code,issue.part,issue.path,issue.message);
}
assert.equal(report.errors,report.files.reduce((n,f)=>n+f.issues.length,0),"Report totals must agree with individual diagnostics");
assert.equal(report.errors,0,"Witnessed extended production corpus must remain free of SDK/OPC diagnostics");
console.log("All seven extended packages passed with zero SDK/OPC diagnostics.");
