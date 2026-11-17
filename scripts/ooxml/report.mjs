import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { buildReport, assertEvidence, markdown, stringify } from "./registry.mjs";
const root=process.cwd(), args=process.argv.slice(2);
const take=key=>{const i=args.indexOf(key);if(i<0)return null;if(!args[i+1]||args[i+1].startsWith("--"))throw Error("Missing value for "+key);return args[i+1];};
const baseline=take("--baseline");
const seed=JSON.parse(readFileSync("src/ooxml/capabilities/seed.json","utf8"));
const resultPath=take("--evidence"),manifest=take("--manifest");
const inventory=manifest?(await import("./schema-inventory.mjs")).inventoryFromManifest(manifest):null;
const sourceRef=execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();
const report=buildReport(seed,{root,sourceRef,inventory,testResult:resultPath?JSON.parse(readFileSync(resultPath,"utf8")):null});
if(args.includes("--require-evidence")) assertEvidence(report);
if(baseline){
  const {compareReports}=await import("./regression.mjs");
  const regressions=compareReports(JSON.parse(readFileSync(baseline,"utf8")),report);
  if(regressions.length) throw Error("OOXML capability regressions: "+JSON.stringify(regressions,null,2));
}
const out=take("--out")??"test-results/ooxml/report";
mkdirSync(out,{recursive:true});
for(const [file,content] of [["capabilities.json",stringify(report)],["capabilities.md",markdown(report)]]) {
  const target=resolve(out,file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);
}
console.log("OOXML report written to "+out+"; inventory "+report.inventory.status);
