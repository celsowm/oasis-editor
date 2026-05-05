import { Project } from "ts-morph";
import * as fs from "fs";

const project = new Project({ tsConfigFilePath: "tsconfig.json" });
const sourceFile = project.getSourceFileOrThrow("src/core/editorCommands.ts");

const mappings = {
  image: ["getSelectedImageRun", "insertImageAtSelection", "resizeSelectedImage", "getSelectedImageAlt", "setSelectedImageAlt", "moveSelectedImageToPosition"],
  text: ["insertTextAtSelection", "insertPlainTextAtSelection", "deleteBackward", "deleteForward", "toggleTextStyle", "setTextStyleValue"],
  block: ["moveBlockToPosition", "splitBlockAtSelection", "insertPageBreakAtSelection", "insertSectionBreakAtSelection", "updateSectionSettings", "setParagraphNamedStyle", "setParagraphStyle", "setParagraphTabStops"],
  list: ["splitListItemAtSelection", "clearParagraphListAtSelection", "indentParagraphList", "outdentParagraphList", "toggleParagraphList", "setParagraphListFormat", "setParagraphListStartAt"],
  table: ["setTableCellStyleValue", "setTableStyleValue", "setTableCellWidth", "setTableRowHeight", "setTableColumnWidths", "setTableCellBorders", "insertTableAtSelection"],
  link: ["getLinkAtSelection", "setLinkAtSelection"],
  history: ["toggleTrackChanges", "acceptRevision", "rejectRevision", "acceptRevisionsInSelection", "rejectRevisionsInSelection"],
  clipboard: ["EditorClipboardParagraphSpec", "serializeEditorSelectionToHtml", "parseEditorClipboardHtml", "insertClipboardParagraphsAtSelection", "insertClipboardHtmlAtSelection"],
  selection: ["getSelectedText", "setSelection", "moveSelectionLeft", "moveSelectionRight", "moveSelectionUp", "moveSelectionDown", "extendSelectionLeft", "extendSelectionRight", "extendSelectionUp", "extendSelectionDown"],
  misc: ["insertFieldAtSelection"]
};

const reverseMapping = {};
for (const [mod, names] of Object.entries(mappings)) {
    for (const name of names) {
        reverseMapping[name] = mod;
    }
}

const unexportedDecls = new Set();
const exportedDecls = new Map();
const unexportedNodes = [];

for (const stmt of sourceFile.getStatements()) {
  if (stmt.getKindName() === "ImportDeclaration") continue;
  
  let isExported = stmt.hasExportKeyword && stmt.hasExportKeyword();
  
  let name;
  if (stmt.getName) {
      name = stmt.getName();
  } else if (stmt.getDeclarations && stmt.getDeclarations().length > 0) {
      name = stmt.getDeclarations()[0].getName();
  }
  
  if (!name) continue;

  if (isExported) {
      exportedDecls.set(name, stmt);
  } else {
      unexportedDecls.add(name);
      unexportedNodes.push(stmt);
      stmt.setIsExported(true); // make them exported in their text
  }
}

for (const name of unexportedDecls) {
    reverseMapping[name] = "utils";
}

const fileContents = {};
for (const mod of Object.keys(mappings).concat("utils")) {
    fileContents[mod] = [];
}

for (const stmt of unexportedNodes) {
    fileContents.utils.push(stmt.getText());
}

for (const [name, stmt] of exportedDecls.entries()) {
    const targetMod = reverseMapping[name] || "misc";
    fileContents[targetMod].push(stmt.getText());
}

const originalImports = sourceFile.getImportDeclarations().map(imp => {
    let moduleSpecifier = imp.getModuleSpecifierValue();
    if (moduleSpecifier.startsWith("./")) {
        moduleSpecifier = `../${moduleSpecifier.slice(2)}`;
    }
    return {
        defaultImport: imp.getDefaultImport()?.getText(),
        namedImports: imp.getNamedImports().map(n => n.getName ? n.getName() : n.getText()), // handle alias if any
        moduleSpecifier,
        isTypeOnly: imp.isTypeOnly()
    };
});

function getWords(text) {
    return new Set(text.match(/[a-zA-Z_]\w*/g) || []);
}

const finalFiles = {};
for (const mod of Object.keys(fileContents)) {
    const text = fileContents[mod].join("\n\n");
    const words = getWords(text);
    
    let out = "";
    for (const imp of originalImports) {
        const usedNamed = imp.namedImports.filter(n => words.has(n));
        if (usedNamed.length > 0 || (imp.defaultImport && words.has(imp.defaultImport))) {
            const defPart = imp.defaultImport ? imp.defaultImport + (usedNamed.length ? ', ' : '') : '';
            const namedPart = usedNamed.length ? `{ ${usedNamed.join(", ")} }` : '';
            out += `import ${imp.isTypeOnly ? 'type ' : ''}${defPart}${namedPart} from "${imp.moduleSpecifier}";\n`;
        }
    }
    
    const neededFromInternal = {};
    for (const word of words) {
        if (reverseMapping[word] && reverseMapping[word] !== mod) {
            const targetMod = reverseMapping[word];
            neededFromInternal[targetMod] = neededFromInternal[targetMod] || new Set();
            neededFromInternal[targetMod].add(word);
        }
    }
    
    for (const [targetMod, names] of Object.entries(neededFromInternal)) {
        out += `import { ${Array.from(names).join(", ")} } from "./${targetMod}.js";\n`;
    }
    
    out += "\n" + text + "\n";
    finalFiles[mod] = out;
}

for (const [mod, content] of Object.entries(finalFiles)) {
    fs.writeFileSync(`src/core/commands/${mod}.ts`, content);
}

let indexContent = "/**\n * @deprecated Use imports from `src/core/commands/*` instead.\n */\n\n";
for (const mod of Object.keys(mappings)) {
    indexContent += `export * from "./commands/${mod}.js";\n`;
}
fs.writeFileSync(`src/core/editorCommands.ts`, indexContent);
console.log("Refactoring complete");
