import type { OasisPlugin } from "../../core/plugin.js";

export interface EssentialsPluginDeps {
  isCommandEnabled: (commandName: string) => boolean;
  selectAll: () => boolean;
  editImageAlt: () => boolean;
  insertFootnote: () => boolean;
  pastePlainText: () => boolean;
  bold: () => boolean;
  italic: () => boolean;
  underline: () => boolean;
  strike: () => boolean;
  superscript: () => boolean;
  subscript: () => boolean;
  link: () => boolean;
  alignLeft: () => boolean;
  alignCenter: () => boolean;
  alignRight: () => boolean;
  alignJustify: () => boolean;
  orderedList: () => boolean;
  bulletList: () => boolean;
  find: () => boolean;
  replace: () => boolean;
  toggleTrackChanges: () => boolean;
  acceptRevisions: () => boolean;
  rejectRevisions: () => boolean;
  toggleShowMargins: () => boolean;
  toggleShowParagraphMarks: () => boolean;
  undo: () => boolean;
  redo: () => boolean;
  pageBreak: () => boolean;
  lineBreak: () => boolean;
  splitBlock: () => boolean;
}

export function createEssentialsPlugin(deps: EssentialsPluginDeps): OasisPlugin {
  const command = (name: string, execute: () => boolean) => ({
    execute,
    refresh: () => ({ isEnabled: deps.isCommandEnabled(name) }),
  });

  return {
    name: "Essentials",
    commands: {
      selectAll: command("selectAll", deps.selectAll),
      editImageAlt: command("editImageAlt", deps.editImageAlt),
      insertFootnote: command("insertFootnote", deps.insertFootnote),
      pastePlainText: command("pastePlainText", deps.pastePlainText),
      bold: command("bold", deps.bold),
      italic: command("italic", deps.italic),
      underline: command("underline", deps.underline),
      strike: command("strike", deps.strike),
      superscript: command("superscript", deps.superscript),
      subscript: command("subscript", deps.subscript),
      link: command("link", deps.link),
      alignLeft: command("alignLeft", deps.alignLeft),
      alignCenter: command("alignCenter", deps.alignCenter),
      alignRight: command("alignRight", deps.alignRight),
      alignJustify: command("alignJustify", deps.alignJustify),
      orderedList: command("orderedList", deps.orderedList),
      bulletList: command("bulletList", deps.bulletList),
      find: command("find", deps.find),
      replace: command("replace", deps.replace),
      toggleTrackChanges: command("toggleTrackChanges", deps.toggleTrackChanges),
      acceptRevisions: command("acceptRevisions", deps.acceptRevisions),
      rejectRevisions: command("rejectRevisions", deps.rejectRevisions),
      toggleShowMargins: command("toggleShowMargins", deps.toggleShowMargins),
      toggleShowParagraphMarks: command("toggleShowParagraphMarks", deps.toggleShowParagraphMarks),
      undo: command("undo", deps.undo),
      redo: command("redo", deps.redo),
      pageBreak: command("pageBreak", deps.pageBreak),
      lineBreak: command("lineBreak", deps.lineBreak),
      splitBlock: command("splitBlock", deps.splitBlock),
    },
  };
}
