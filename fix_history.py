import re

file_path = "src/app/controllers/useEditorHistoryActions.ts"

with open(file_path, 'r') as f:
    content = f.read()

search_pattern = r"""  const applySelectionPreservingStructure = \(
    nextSelection: EditorState\["selection"\],
  \) => \{
    const snapshot = deps\.stateSnapshot\(\);
    deps\.applyHistoryState\(\{
      \.\.\.snapshot,
      document: \{
        \.\.\.snapshot\.document,
        sections: snapshot\.document\.sections\?\.map\(cloneSection\),
      \},
      selection: \{
        anchor: \{ \.\.\.nextSelection\.anchor \},
        focus: \{ \.\.\.nextSelection\.focus \},
      \},
    \}\);
  \};"""

replacement_pattern = r"""  const applySelectionPreservingStructure = (
    nextSelection: EditorState["selection"],
  ) => {
    const snapshot = deps.stateSnapshot();
    deps.applyHistoryState({
      ...snapshot,
      selection: {
        anchor: { ...nextSelection.anchor },
        focus: { ...nextSelection.focus },
      },
    });
  };"""

new_content = re.sub(search_pattern, replacement_pattern, content)

with open(file_path, 'w') as f:
    f.write(new_content)

print("Fixed useEditorHistoryActions.ts")
