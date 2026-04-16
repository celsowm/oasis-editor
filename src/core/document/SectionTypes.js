/**
 * @typedef {{ top: number, right: number, bottom: number, left: number }} Margins
 * @typedef {{ startOnNewPage: boolean, startOnOddPage: boolean }} SectionBreakPolicy
 * @typedef {{
 *   id: string,
 *   pageTemplateId: string,
 *   margins: Margins,
 *   orientation: 'portrait'|'landscape',
 *   children: import('./BlockTypes.js').BlockNode[],
 *   breakPolicy: SectionBreakPolicy,
 * }} SectionNode
 */

export const createDefaultMargins = () => ({ top: 96, right: 96, bottom: 96, left: 96 });
export const createDefaultBreakPolicy = () => ({ startOnNewPage: false, startOnOddPage: false });
