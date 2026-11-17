import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildReport,validateSeed,assertEvidence,stringify,dimensions } from "./registry.mjs";
import { compareReports } from "./regression.mjs";
import { inspectSchema, resolveReferences } from "./schema-inventory.mjs";
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

test("direct QName graph resolves types, groups, references and builtins",()=>{
 const x='<x:schema xmlns:x="http://www.w3.org/2001/XMLSchema" xmlns:t="urn:types" targetNamespace="urn:types"><x:complexType name="Base"><x:attribute name="count" type="x:int"/></x:complexType><x:complexType name="Child"><x:complexContent><x:extension base="t:Base"><x:sequence><x:group ref="t:G"/></x:sequence></x:extension></x:complexContent></x:complexType><x:group name="G"><x:sequence><x:element name="item" type="t:Missing"/></x:sequence></x:group></x:schema>';
 const data=inspectSchema(x,"strict","test.xsd");
 const g=resolveReferences(data.declarations,data.references);
 assert.equal(g.summary.resolved,2);
 assert.equal(g.summary["builtin-namespace"],1);
 assert.equal(g.summary.unresolved,1);
 assert.ok(data.declarations.some(d=>d.kind==="attribute"&&d.name==="count"));
});
test("regression gate rejects loss or downgrade of demonstrated capability",()=>{
 const prior={version:1,evidenceMode:"runner-results",entries:[{...seed.entries[0],support:{import:"partial",export:"supported"}}]};
 const same=structuredClone(prior);
 assert.deepEqual(compareReports(prior,same),[]);
 same.entries[0].support.import="unknown";
 same.entries[0].support.export="partial";
 assert.equal(compareReports(prior,same).length,2);
 same.entries=[];
 assert.equal(compareReports(prior,same).length,2);
 assert.throws(()=>compareReports(prior,{...same,evidenceMode:"static-audit-only"}),/runner evidence/);
});

test("UTF-8 BOM is accepted without changing source identity",()=>{
 const xml='<?xml version="1.0"?><xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="p" type="xs:string"/></xs:schema>';
 assert.deepEqual(inspectSchema("\uFEFF"+xml,"strict","bom.xsd"),inspectSchema(xml,"strict","bom.xsd"));
});
test("effective schema projection expands attributes/base/groups and retains choice cardinality",async()=>{
 const {buildEffectiveInventory}=await import("./effective-schema.mjs");
 const x='<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:t="urn:t" targetNamespace="urn:t" elementFormDefault="qualified" attributeFormDefault="qualified">'+
 '<xs:simpleType name="Mode"><xs:restriction base="xs:string"><xs:enumeration value="a"/><xs:enumeration value="b"/></xs:restriction></xs:simpleType>'+
 '<xs:attributeGroup name="A"><xs:attribute name="mode" type="t:Mode"/></xs:attributeGroup>'+
 '<xs:complexType name="Base"><xs:sequence><xs:element name="p" type="xs:string"/></xs:sequence><xs:attribute name="id" type="xs:int" use="required"/></xs:complexType>'+
 '<xs:group name="G"><xs:choice minOccurs="0" maxOccurs="unbounded"><xs:element name="x" type="xs:string"/><xs:element name="y" type="xs:string"/></xs:choice></xs:group>'+
 '<xs:complexType name="Child"><xs:complexContent><xs:extension base="t:Base"><xs:group ref="t:G"/><xs:attributeGroup ref="t:A"/></xs:extension></xs:complexContent></xs:complexType>'+
 '<xs:element name="doc" type="t:Child"/></xs:schema>';
 const data=inspectSchema(x,"strict","test.xsd");
 const report=buildEffectiveInventory(data.declarations,resolveReferences(data.declarations,data.references));
 const doc=report.projections.find(p=>p.kind==="element"&&p.name==="doc");
 assert.deepEqual(doc.attributes.map(a=>a.name).sort(),["id","mode"]);
 assert.equal(doc.attributes.find(a=>a.name==="id").use,"required");
 assert.deepEqual(doc.attributes.find(a=>a.name==="mode").enumeration,["a","b"]);
 assert.equal(doc.particles[0].children[0].name,"p");
 assert.equal(doc.particles[1].children[0].kind,"choice");
 assert.equal(doc.particles[1].children[0].occurs.max,"unbounded");
 assert.equal(report.status,"partial");
});

test("DOCX scope follows actual element edges, bounds recursion and separates evidence from schema support",async()=>{
 const {buildEffectiveInventory}=await import("./effective-schema.mjs");
 const {buildDocxScope}=await import("./docx-scope.mjs");
 const xml='<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:t="urn:doc" targetNamespace="urn:doc" elementFormDefault="qualified"><xs:complexType name="Recursive"><xs:sequence><xs:element name="p" type="t:Recursive" minOccurs="0"/></xs:sequence><xs:attribute name="mode"><xs:simpleType><xs:restriction base="xs:string"><xs:enumeration value="a"/><xs:enumeration value="b"/></xs:restriction></xs:simpleType></xs:attribute></xs:complexType><xs:element name="document" type="t:Recursive"/><xs:element name="workbook" type="xs:string"/></xs:schema>';
 const x=inspectSchema(xml,"transitional","transitional/wml.xsd");
 const effective=buildEffectiveInventory(x.declarations,resolveReferences(x.declarations,x.references));
 const roots=[{file:"wml.xsd",domain:"word",names:["document","missing"]}];
 const result=buildDocxScope({effective},[{profile:"transitional",namespace:"urn:doc",element:"p",context:"document",domain:"word",support:{import:"partial"},evidence:[],limitations:[]}],roots);
 assert.equal(result.counts.roots,1);
 assert.equal(result.counts.missingRoots,1);
 assert.equal(result.counts.contexts,3); // document root, document/p, recursive p/p
 assert.ok(!result.rows.some(r=>r.element==="workbook"));
 assert.equal(result.counts.attributeOccurrences,3);
 assert.equal(result.counts.enumeratedValueOccurrences,6);
 assert.ok(result.rows.every(r=>r.support.import==="unknown"));
 assert.equal(result.rows.find(r=>r.context?.element==="document").observations[0].contextHint,"parent-name-match");
 assert.equal(result.rows.find(r=>r.context?.element==="p").observations[0].contextHint,"different-context");
 assert.equal(stringify(result),stringify(buildDocxScope({effective},[{profile:"transitional",namespace:"urn:doc",element:"p",context:"document",domain:"word",support:{import:"partial"},evidence:[],limitations:[]}],roots)));
});

test("official style unprefixed QNames resolve via explicit default namespace",async()=>{
 const {buildEffectiveInventory}=await import("./effective-schema.mjs");
 const {buildDocxScope}=await import("./docx-scope.mjs");
 const xml='<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="urn:word" targetNamespace="urn:word" elementFormDefault="qualified" attributeFormDefault="qualified"><xsd:complexType name="CT_Doc"><xsd:sequence><xsd:element name="body" type="CT_Body"/></xsd:sequence></xsd:complexType><xsd:complexType name="CT_Body"><xsd:sequence><xsd:element name="p" type="xsd:string"/></xsd:sequence><xsd:attribute name="val" type="xsd:string"/></xsd:complexType><xsd:element name="document" type="CT_Doc"/></xsd:schema>';
 const data=inspectSchema(xml,"transitional","transitional/wml.xsd");
 const graph=resolveReferences(data.declarations,data.references);
 assert.equal(graph.summary.resolved,2);
 const effective=buildEffectiveInventory(data.declarations,graph);
 const scope=buildDocxScope({effective},[],[{file:"wml.xsd",domain:"word",names:["document"]}]);
 assert.equal(scope.counts.contexts,3);
 assert.equal(scope.counts.attributeOccurrences,1);
 assert.ok(scope.rows.some(r=>r.element==="p"&&r.context?.element==="body"));
 const {assertOfficialDocxScope}=await import("./scope-gate.mjs");
 assert.throws(()=>assertOfficialDocxScope(scope),/Incomplete Word document traversal/);
});
