import { defaultMenuRegistry, type MenuItem } from "./menuRegistry.js";

export const defaultMenuItems: MenuItem[] = [
  // File
  { id: "file_new", path: "File/New", labelKey: "menu.file.new", shortcut: "Ctrl+N", hidden: true, icon: "file-plus" },
  { id: "file_import", path: "File/Import", labelKey: "toolbar.import", shortcut: "Ctrl+O", action: (ctx) => ctx.importInputRef()?.click(), icon: "upload" },
  { id: "file_save", path: "File/Save", labelKey: "generic.save", shortcut: "Ctrl+S", hidden: true, icon: "save" },
  { id: "file_export", path: "File/Export", labelKey: "menu.file.export", icon: "download" },
  { id: "file_export_pdf", path: "File/Export/PDF", hidden: true },
  { id: "file_export_docx", path: "File/Export/DOCX", action: (ctx) => void ctx.handleExportDocx(), icon: "file-text" },
  { id: "file_export_html", path: "File/Export/HTML", hidden: true },
  { id: "file_export_md", path: "File/Export/MD", hidden: true },
  { id: "file_print", path: "File/Print", labelKey: "menu.file.print", shortcut: "Ctrl+P", action: () => window.print(), icon: "printer" },

  // Edit
  { id: "edit_undo", path: "Edit/Undo", labelKey: "toolbar.undo", shortcut: "Ctrl+Z", action: (ctx) => ctx.performUndo(), icon: "undo-2" },
  { id: "edit_redo", path: "Edit/Redo", labelKey: "toolbar.redo", shortcut: "Ctrl+Y", action: (ctx) => ctx.performRedo(), icon: "redo-2" },
  { id: "edit_cut", path: "Edit/Cut", labelKey: "menu.edit.cut", shortcut: "Ctrl+X", hidden: true },
  { id: "edit_copy", path: "Edit/Copy", labelKey: "menu.edit.copy", shortcut: "Ctrl+C", action: () => document.execCommand("copy"), icon: "copy" },
  { id: "edit_paste", path: "Edit/Paste", labelKey: "menu.edit.paste", shortcut: "Ctrl+V", hidden: true },
  { id: "edit_find", path: "Edit/Find & Replace", labelKey: "find.title", shortcut: "Ctrl+F", action: (ctx) => ctx.toggleFindReplace(true), icon: "search" },
  { id: "edit_selectAll", path: "Edit/Select All", labelKey: "menu.edit.selectAll", shortcut: "Ctrl+A", hidden: true },

  // View
  { id: "view_outline", path: "View/Show Outline", labelKey: "menu.view.outline", hidden: true },
  { id: "view_ruler", path: "View/Show Ruler", hidden: true },
  { id: "view_fullscreen", path: "View/Full Screen", labelKey: "menu.view.fullscreen", hidden: true },
  { id: "view_zoom", path: "View/Zoom", labelKey: "status.zoom", hidden: true },
  { id: "view_zoom_50", path: "View/Zoom/50%", hidden: true },
  { id: "view_zoom_75", path: "View/Zoom/75%", hidden: true },
  { id: "view_zoom_100", path: "View/Zoom/100%", hidden: true },
  { id: "view_zoom_125", path: "View/Zoom/125%", hidden: true },
  { id: "view_zoom_150", path: "View/Zoom/150%", hidden: true },
  { id: "view_zoom_200", path: "View/Zoom/200%", hidden: true },

  // Insert
  { id: "insert_image", path: "Insert/Image", labelKey: "toolbar.image", action: (ctx) => ctx.imageInputRef()?.click(), icon: "image" },
  { id: "insert_table", path: "Insert/Table", labelKey: "toolbar.table", action: (ctx) => ctx.insertTableCommand(3, 3), icon: "table" },
  { id: "insert_link", path: "Insert/Link", labelKey: "toolbar.link", action: (ctx) => ctx.promptForLink(), icon: "link" },
  { id: "insert_hr", path: "Insert/Horizontal Rule", hidden: true },
  { id: "insert_pageBreak", path: "Insert/Page Break", labelKey: "metric.pageBreak", action: (ctx) => ctx.applyInsertPageBreakCommand(), icon: "file-minus" },
  { id: "insert_specialChar", path: "Insert/Special Character", hidden: true },
  { id: "insert_comment", path: "Insert/Comment", hidden: true },

  // Format
  { id: "format_text", path: "Format/Text", labelKey: "menu.format.text", icon: "type" },
  { id: "format_text_bold", path: "Format/Text/Bold", labelKey: "toolbar.bold", shortcut: "Ctrl+B", action: (ctx) => ctx.applyBooleanStyleCommand("bold"), icon: "bold" },
  { id: "format_text_italic", path: "Format/Text/Italic", labelKey: "toolbar.italic", shortcut: "Ctrl+I", action: (ctx) => ctx.applyBooleanStyleCommand("italic"), icon: "italic" },
  { id: "format_text_underline", path: "Format/Text/Underline", labelKey: "toolbar.underline", shortcut: "Ctrl+U", action: (ctx) => ctx.applyBooleanStyleCommand("underline"), icon: "underline" },
  { id: "format_text_strike", path: "Format/Text/Strikethrough", labelKey: "toolbar.strike", action: (ctx) => ctx.applyBooleanStyleCommand("strike"), icon: "strikethrough" },
  { id: "format_paragraphStyles", path: "Format/Paragraph styles", labelKey: "toolbar.style", hidden: true },
  { id: "format_align", path: "Format/Align", labelKey: "menu.format.align", icon: "align-left" },
  { id: "format_align_left", path: "Format/Align/Left", labelKey: "toolbar.alignLeft", action: (ctx) => ctx.applyParagraphStyleCommand("align", "left"), icon: "align-left" },
  { id: "format_align_center", path: "Format/Align/Center", labelKey: "toolbar.alignCenter", action: (ctx) => ctx.applyParagraphStyleCommand("align", "center"), icon: "align-center" },
  { id: "format_align_right", path: "Format/Align/Right", labelKey: "toolbar.alignRight", action: (ctx) => ctx.applyParagraphStyleCommand("align", "right"), icon: "align-right" },
  { id: "format_align_justify", path: "Format/Align/Justify", labelKey: "toolbar.justify", action: (ctx) => ctx.applyParagraphStyleCommand("align", "justify"), icon: "align-justify" },
  { id: "format_lineSpacing", path: "Format/Line spacing", hidden: true },
  { id: "format_lists", path: "Format/Lists", labelKey: "menu.format.lists", icon: "list" },
  { id: "format_lists_bullet", path: "Format/Lists/Bullet List", labelKey: "toolbar.bulletList", action: (ctx) => ctx.applyParagraphListCommand("bullet"), icon: "list" },
  { id: "format_lists_numbered", path: "Format/Lists/Numbered List", labelKey: "toolbar.numberedList", action: (ctx) => ctx.applyParagraphListCommand("ordered"), icon: "list-ordered" },
  { id: "format_clear", path: "Format/Clear formatting", hidden: true },

  // Tools
  { id: "tools_wordcount", path: "Tools/Word count", labelKey: "menu.tools.wordcount", hidden: true },
  { id: "tools_spelling", path: "Tools/Spelling", hidden: true },
  { id: "tools_preferences", path: "Tools/Preferences", hidden: true },

  // Help
  { id: "help_shortcuts", path: "Help/Keyboard shortcuts", labelKey: "menu.help.shortcuts", hidden: true },
  { id: "help_about", path: "Help/About", labelKey: "menu.help.about", hidden: true },
];

defaultMenuItems.forEach(item => defaultMenuRegistry.register(item));
