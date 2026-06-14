import re

files_to_fix = [
    "src/app/controllers/tableOpsRowColumnCommands.ts",
    "src/app/controllers/tableOpsCellSpanCommands.ts"
]

search_pattern = r"""    const targetBlocks = deps
      \.getTargetBlocks\(current, (range\.zone|location\.zone)\)
      \.map\(cloneBlock\);
    const tableBlock = targetBlocks\[(range\.blockIndex|location\.blockIndex)\] as EditorTableNode;
    if \(!tableBlock \|\| tableBlock\.type !== "table"\) \{
      return current;
    \}"""

replacement_pattern = r"""    const originalBlocks = deps.getTargetBlocks(current, \1);
    const targetBlocks = [...originalBlocks];
    const originalTableBlock = originalBlocks[\2] as EditorTableNode;
    if (!originalTableBlock || originalTableBlock.type !== "table") {
      return current;
    }
    const tableBlock = cloneBlock(originalTableBlock) as EditorTableNode;
    targetBlocks[\2] = tableBlock;"""

for file_path in files_to_fix:
    with open(file_path, 'r') as f:
        content = f.read()

    new_content = re.sub(search_pattern, replacement_pattern, content)

    with open(file_path, 'w') as f:
        f.write(new_content)

print("Fixed tableOps*.ts")
