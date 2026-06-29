import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const targetRoots = [
  "src/ui/components",
  "src/ui/shells",
  "src/ui/OasisEditorEditor.tsx",
  "src/ui/OasisEditorLoading.tsx",
];

const allowlistedFiles = new Map([
  ["src/ui/public/", "primitive implementation"],
  ["src/ui/components/Toolbar/primitives/", "toolbar primitive implementation"],
  ["src/ui/components/Toolbar/ShapeGallery.tsx", "pending gallery migration"],
  ["src/ui/components/Toolbar/StyleGallery.tsx", "pending gallery migration"],
  [
    "src/ui/components/Toolbar/LineSpacingButton.tsx",
    "pending toolbar migration",
  ],
  [
    "src/ui/components/Toolbar/controls/UnderlineControl.tsx",
    "pending toolbar migration",
  ],
  [
    "src/ui/components/Toolbar/controls/ListOptionsControl.tsx",
    "pending toolbar migration",
  ],
  [
    "src/ui/components/Toolbar/groups/MarginsGroup.tsx",
    "pending toolbar migration",
  ],
  [
    "src/ui/components/FloatingToolbar/FloatingLayoutOptions.tsx",
    "pending floating toolbar migration",
  ],
  ["src/ui/components/PluginUi/PluginUiHost.tsx", "pending plugin host polish"],
  [
    "src/ui/components/Dialogs/Dialog.tsx",
    "public dialog primitive implementation",
  ],
  ["src/ui/components/Tabs/Tabs.tsx", "public tabs primitive implementation"],
  ["src/ui/components/Outline/OutlinePanel.tsx", "pending outline migration"],
  ["src/ui/components/WelcomeOverlay.tsx", "pending heading/text migration"],
  ["src/ui/components/ContextMenu/ContextMenu.tsx", "pending menu migration"],
  ["src/ui/components/Toolbar/Toolbar.tsx", "toolbar shell structure"],
  [
    "src/ui/components/Toolbar/ribbon/RibbonGroup.tsx",
    "toolbar shell structure",
  ],
  [
    "src/ui/components/Toolbar/ribbon/RibbonTabs.tsx",
    "toolbar shell structure",
  ],
  [
    "src/ui/components/Toolbar/ToolbarOverflowManager.tsx",
    "pending toolbar migration",
  ],
  ["src/ui/components/Ruler/HorizontalRuler.tsx", "low-level ruler controls"],
  ["src/ui/shells/BalloonShell.tsx", "shell stage structure"],
  ["src/ui/shells/DocumentShell.tsx", "shell stage structure"],
  ["src/ui/shells/InlineShell.tsx", "shell stage structure"],
  ["src/ui/OasisEditorEditor.tsx", "editor host controls pending migration"],
  ["src/ui/OasisEditorLoading.tsx", "loading host pending migration"],
  ["src/ui/overlays/ResizeHandlesOverlay.tsx", "low-level overlay controls"],
  ["src/ui/components/CaretOverlay.tsx", "low-level overlay text"],
  ["src/ui/components/SelectionOverlay.tsx", "low-level overlay text"],
  ["src/ui/components/RevisionOverlay.tsx", "pending overlay migration"],
  [
    "src/ui/components/CommentHighlightOverlay.tsx",
    "pending overlay migration",
  ],
  ["src/ui/components/CanvasEditorSurface.tsx", "canvas host"],
]);

const disallowedTags = new Set([
  "button",
  "input",
  "label",
  "select",
  "textarea",
  "fieldset",
  "legend",
  "span",
  "section",
  "aside",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

function isAllowlisted(filePath) {
  for (const prefix of allowlistedFiles.keys()) {
    if (filePath.startsWith(prefix)) return true;
  }
  return false;
}

function gatherFiles(entryPath, result = []) {
  const absolute = path.join(repoRoot, entryPath);
  if (!fs.existsSync(absolute)) return result;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    if (absolute.endsWith(".tsx")) result.push(entryPath.replace(/\\/g, "/"));
    return result;
  }
  for (const entry of fs.readdirSync(absolute, { withFileTypes: true })) {
    const rel = path.join(entryPath, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) gatherFiles(rel, result);
    else if (entry.name.endsWith(".tsx")) result.push(rel);
  }
  return result;
}

function scanFile(filePath) {
  const source = fs.readFileSync(path.join(repoRoot, filePath), "utf8");
  const lines = source.split(/\r?\n/);
  const violations = [];

  lines.forEach((line, index) => {
    const matches = [...line.matchAll(/<([a-z][a-z0-9-]*)\b/g)];
    for (const match of matches) {
      const tag = match[1];
      if (!disallowedTags.has(tag)) continue;
      violations.push({
        file: filePath,
        line: index + 1,
        tag,
        snippet: line.trim(),
      });
    }
  });

  return violations;
}

export function scanNativeUiTags() {
  const files = targetRoots.flatMap((entry) => gatherFiles(entry));
  return files
    .filter((file) => !isAllowlisted(file))
    .flatMap((file) => scanFile(file));
}

const violations = scanNativeUiTags();
if (violations.length > 0) {
  console.error("Raw native UI tags found outside the allowlist:\n");
  for (const violation of violations) {
    console.error(
      `${violation.file}:${violation.line} <${violation.tag}> ${violation.snippet}`,
    );
  }
  process.exitCode = 1;
}
