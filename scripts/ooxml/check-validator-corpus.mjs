import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
const [positivePath, negativePath]=process.argv.slice(2);
const positive=JSON.parse(readFileSync(positivePath,"utf8")), negative=JSON.parse(readFileSync(negativePath,"utf8"));
assert.deepEqual(positive.files.map(f=>f.file).sort(),["fresh-paragraph.docx","fresh-table.docx","source-edited.docx","source-noop.docx"]);
assert.equal(negative.files.length,2);
assert.ok(negative.files.find(f=>f.file==="missing-target.docx")?.issues.some(i=>i.code==="RELATIONSHIP_TARGET_MISSING"),"Missing OPC target must be detected");
assert.ok(negative.files.find(f=>f.file==="invalid-schema.docx")?.issues.some(i=>i.category==="Schema"),"Malformed WordprocessingML must trigger SDK schema validator");
console.log("Negative controls validated; positive corpus has "+positive.errors+" diagnostics.");
// Initial characterization only. Pin reviewed diagnostics and fail new ones
// in the subsequent slice; do not silently accept unreviewed findings as baseline.
if(positive.files.some(f=>f.issues.some(i=>i.code==="PACKAGE_OPEN_ERROR")))throw Error("Production output cannot be opened by SDK");
