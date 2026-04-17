// @ts-nocheck








/**
 * @typedef {{ x: number, y: number, width: number, height: number }} Rect
 * @typedef {{
 *   id: string,
 *   text: string,
 *   width: number,
 *   height: number,
 *   offsetStart: number,
 *   offsetEnd: number,
 *   y: number,
 * }} LineInfo
 * @typedef {{
 *   id: string,
 *   blockId: string,
 *   sectionId: string,
 *   pageId: string,
 *   fragmentIndex: number,
 *   kind: string,
 *   startOffset: number,
 *   endOffset: number,
 *   text: string,
 *   rect: Rect,
 *   typography: { fontFamily: string, fontSize: number, fontWeight: number },
 *   marks: Record<string, any>,
 *   lines: LineInfo[],
 * }} LayoutFragment
 */
