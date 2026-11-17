import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildReport,validateSeed,assertEvidence,stringify,dimensions } from "./registry.mjs";
import { inspectSchema } from "./schema-inventory.mjs";
const root=process.cwd();
const seed=JSON.parse(readFileSync("src/ooxml/capabilities/seed.json","utf8"));
test("seed is unique and references real tests",()=>validateSeed(seed,root));
test("static evidence never certifies a semantic feature",()=>{
  const report=buildReport(seed,{root});
  assert.equal(report.denominator,null);
  assert.equal(report.inventory.status,"incomplete");
  assert.ok(report.entries.every(e=>dimensions.every(d=>["unknown","missing"].includes(e.support[d]))));
  assert.throws(()=>assertEvidence(report),/Missing or failing/);
  assert.equal(stringify(report),stringify(buildReport(seed,{root})));
});
test("exact runner case must pass; duplicate failures and skipped cases cannot pass",()=>{
  const ev=seed.entries[0].evidence[0];
  const result=statuses=>({testResults:[{name:resolve(root,ev.file),assertionResults:statuses.map(status=>({fullName:ev.case,status}))}]});
  const get=statuses=>buildReport(seed,{root,testResult:result(statuses)}).entries.find(e=>e.element==="p");
  assert.equal(get(["passed"]).support.import,"partial");
  assert.equal(get(["passed","failed"]).support.import,"unknown");
  assert.equal(get(["skipped"]).support.import,"unknown");
  assert.equal(get(["passed"]).support.render,"unknown");
  assert.throws(()=>validateSeed({...seed,entries:[seed.entries[0],seed.entries[0]]},root),/Duplicate/);
});
test("lexical XSD prototype keeps repeated element contexts and unresolved references",()=>{
  const types=Array.from({length:5},(_,i)=>'<xs:complexType name="T'+i+'"><xs:sequence><xs:element name="p" type="xs:string"/></xs:sequence></xs:complexType>').join("");
  const xml='<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:test">'+types+'<xs:import namespace="urn:other" schemaLocation="other.xsd"/></xs:schema>';
  const result=inspectSchema(xml,"strict","synthetic.xsd");
  const p=result.declarations.filter(d=>d.name==="p");
  assert.equal(p.length,5);
  assert.equal(new Set(p.map(d=>d.context)).size,5);
  assert.ok(result.references.some(r=>r.location==="other.xsd"));
  assert.throws(()=>inspectSchema('<!DOCTYPE x>'+xml,"strict","bad"),/DTD/);
});
