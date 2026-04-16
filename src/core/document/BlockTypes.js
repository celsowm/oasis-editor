/**
 * @typedef {{ bold?: boolean, italic?: boolean, underline?: boolean, color?: string, fontFamily?: string, fontSize?: number }} MarkSet
 * @typedef {{ id: string, text: string, marks: MarkSet }} TextRun
 * @typedef {{ id: string, kind: 'paragraph', align: 'left'|'center'|'right'|'justify', children: TextRun[] }} ParagraphNode
 * @typedef {{ id: string, kind: 'heading', level: 1|2|3|4|5|6, align: 'left'|'center'|'right', children: TextRun[] }} HeadingNode
 * @typedef {ParagraphNode|HeadingNode} BlockNode
 */
