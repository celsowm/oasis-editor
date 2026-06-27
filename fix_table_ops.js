const fs = require('fs');

function replaceMapCloneBlock(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    /const targetBlocks = deps\s*\n\s*\.getTargetBlocks\(current, (location|range)\.zone\)\s*\n\s*\.map\(cloneBlock\);/g,
    `const targetBlocks = [...deps.getTargetBlocks(current, $1.zone)];\n    const originalTableBlock = targetBlocks[$1.blockIndex];\n    if (originalTableBlock) {\n      targetBlocks[$1.blockIndex] = cloneBlock(originalTableBlock);\n    }`
  );
  fs.writeFileSync(file, content);
}

replaceMapCloneBlock('src/app/controllers/tableOpsRowColumnCommands.ts');
replaceMapCloneBlock('src/app/controllers/tableOpsCellSpanCommands.ts');
