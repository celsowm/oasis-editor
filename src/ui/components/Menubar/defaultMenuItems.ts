import { defaultMenuRegistry, type MenuItem } from "./menuRegistry.js";
import type { EditorToolbarCtx } from "../Toolbar/types.js";

export const defaultMenuItems: MenuItem[] = [
  // File
  { id: "file_new", path: "File/New", labelKey: "menu.file.new", shortcut: "Ctrl+N" },
  { id: "file_open", path: "File/Open", labelKey: "toolbar.file", shortcut: "Ctrl+O" },
  { id: "file_save", path: "File/Save", labelKey: "generic.save", shortcut: "Ctrl+S" },
  { id: "file_download", path: "File/Download as", labelKey: "toolbar.export" },
  { id: "file_download_pdf", path: "File/Download as/PDF" },
  { id: "file_download_docx", path: "File/Download as/DOCX" },
  { id: "file_download_html", path: "File/Download as/HTML" },
  { id: "file_download_md", path: "File/Download as/MD" },
  { id: "file_print", path: "File/Print", labelKey: "menu.file.print", shortcut: "Ctrl+P", action: () => window.print() },

  // Edit
  { id: "edit_undo", path: "Edit/Undo", labelKey: "toolbar.undo", shortcut: "Ctrl+Z", action: (ctx: any) => ctx.historyOps.undo() },
  { id: "edit_redo", path: "Edit/Redo", labelKey: "toolbar.redo", shortcut: "Ctrl+Y", action: (ctx: any) => ctx.historyOps.redo() },
  { id: "edit_sep1", path: "Edit/sep1", separator: true },
  { id: "edit_cut", path: "Edit/Cut", labelKey: "menu.edit.cut", shortcut: "Ctrl+X" },
  { id: "edit_copy", path: "Edit/Copy", labelKey: "menu.edit.copy", shortcut: "Ctrl+C", action: () => document.execCommand('copy') },
  { id: "edit_paste", path: "Edit/Paste", labelKey: "menu.edit.paste", shortcut: "Ctrl+V" },
  { id: "edit_sep2", path: "Edit/sep2", separator: true },
  { id: "edit_find", path: "Edit/Find & Replace", labelKey: "find.title", shortcut: "Ctrl+F", action: (ctx: any) => ctx.commandsController.toggleFindReplace(true) },
  { id: "edit_selectAll", path: "Edit/Select All", labelKey: "menu.edit.selectAll", shortcut: "Ctrl+A" },

  // View
  { id: "view_outline", path: "View/Show Outline", labelKey: "menu.view.outline" },
  { id: "view_ruler", path: "View/Show Ruler" },
  { id: "view_fullscreen", path: "View/Full Screen", labelKey: "menu.view.fullscreen" },
  { id: "view_zoom", path: "View/Zoom", labelKey: "status.zoom" },
  { id: "view_zoom_50", path: "View/Zoom/50%" },
  { id: "view_zoom_75", path: "View/Zoom/75%" },
  { id: "view_zoom_100", path: "View/Zoom/100%" },
  { id: "view_zoom_125", path: "View/Zoom/125%" },
  { id: "view_zoom_150", path: "View/Zoom/150%" },
  { id: "view_zoom_200", path: "View/Zoom/200%" },

  // Insert
  { id: "insert_image", path: "Insert/Image", labelKey: "toolbar.image", action: (ctx: any) => ctx.imageOps.insertImageCommand() },
  { id: "insert_table", path: "Insert/Table", labelKey: "toolbar.table", action: (ctx: any) => ctx.tableOps.insertTableCommand() },
  { id: "insert_link", path: "Insert/Link", labelKey: "toolbar.link", action: (ctx: any) => ctx.commandsController.promptForLink() },
  { id: "insert_hr", path: "Insert/Horizontal Rule" },
  { id: "insert_pageBreak", path: "Insert/Page Break", labelKey: "metric.pageBreak", action: (ctx: any) => ctx.commandsController.applyInsertPageBreakCommand() },
  { id: "insert_specialChar", path: "Insert/Special Character" },
  { id: "insert_comment", path: "Insert/Comment" },

  // Format
  { id: "format_text", path: "Format/Text" },
  { id: "format_text_bold", path: "Format/Text/Bold", labelKey: "toolbar.bold", shortcut: "Ctrl+B", action: (ctx: any) => ctx.commandsController.applyBooleanStyleCommand("bold") },
  { id: "format_text_italic", path: "Format/Text/Italic", labelKey: "toolbar.italic", shortcut: "Ctrl+I", action: (ctx: any) => ctx.commandsController.applyBooleanStyleCommand("italic") },
  { id: "format_text_underline", path: "Format/Text/Underline", labelKey: "toolbar.underline", shortcut: "Ctrl+U", action: (ctx: any) => ctx.commandsController.applyBooleanStyleCommand("underline") },
  { id: "format_text_strike", path: "Format/Text/Strikethrough", labelKey: "toolbar.strike", action: (ctx: any) => ctx.commandsController.applyBooleanStyleCommand("strike") },
  { id: "format_paragraphStyles", path: "Format/Paragraph styles", labelKey: "toolbar.style" },
  { id: "format_align", path: "Format/Align", labelKey: "menu.format.align" },
  { id: "format_align_left", path: "Format/Align/Left", labelKey: "toolbar.alignLeft", action: (ctx: any) => ctx.commandsController.applyParagraphStyleCommand("align", "left") },
  { id: "format_align_center", path: "Format/Align/Center", labelKey: "toolbar.alignCenter", action: (ctx: any) => ctx.commandsController.applyParagraphStyleCommand("align", "center") },
  { id: "format_align_right", path: "Format/Align/Right", labelKey: "toolbar.alignRight", action: (ctx: any) => ctx.commandsController.applyParagraphStyleCommand("align", "right") },
  { id: "format_align_justify", path: "Format/Align/Justify", labelKey: "toolbar.justify", action: (ctx: any) => ctx.commandsController.applyParagraphStyleCommand("align", "justify") },
  { id: "format_lineSpacing", path: "Format/Line spacing" },
  { id: "format_lists", path: "Format/Lists" },
  { id: "format_lists_bullet", path: "Format/Lists/Bullet List", labelKey: "toolbar.bulletList", action: (ctx: any) => ctx.commandsController.applyParagraphListCommand("bullet") },
  { id: "format_lists_numbered", path: "Format/Lists/Numbered List", labelKey: "toolbar.numberedList", action: (ctx: any) => ctx.commandsController.applyParagraphListCommand("ordered") },
  { id: "format_clear", path: "Format/Clear formatting" },

  // Tools
  { id: "tools_wordcount", path: "Tools/Word count", labelKey: "menu.tools.wordcount" },
  { id: "tools_spelling", path: "Tools/Spelling" },
  { id: "tools_preferences", path: "Tools/Preferences" },

  // Help
  { id: "help_shortcuts", path: "Help/Keyboard shortcuts", labelKey: "menu.help.shortcuts" },
  { id: "help_about", path: "Help/About", labelKey: "menu.help.about" },
];

defaultMenuItems.forEach(item => defaultMenuRegistry.register(item));
