import { describe, expect, it } from 'vitest';
import type { EditorDocument } from '../../core/model.js';
import { OasisPdfWriter } from '../../export/pdf/OasisPdfWriter.js';
import { exportEditorDocumentToPdfBlob } from '../../export/pdf/exportEditorDocumentToPdf.js';

function decodePdf(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

describe('OasisPdfWriter', () => {
  it('writes a structurally valid PDF with basic drawing commands', () => {
    const writer = new OasisPdfWriter();
    const pageIndex = writer.addPage({ width: 612, height: 792 });

    writer.drawRect(pageIndex, {
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      fill: '#ffffff',
      stroke: '#111827',
      lineWidth: 1,
    });
    writer.drawLine(pageIndex, {
      x1: 10,
      y1: 90,
      x2: 110,
      y2: 90,
      stroke: '#d1d5db',
      lineWidth: 0.75,
    });
    writer.drawText(pageIndex, {
      x: 24,
      y: 48,
      text: 'Hello PDF',
      fontSize: 12,
      color: '#111827',
    });
    writer.drawText(pageIndex, {
      x: 24,
      y: 68,
      text: 'Bold italic PDF',
      fontSize: 14,
      color: '#ff0000',
      bold: true,
      italic: true,
    });

    const blob = writer.toBlob();
    const pdf = decodePdf(writer.toArrayBuffer());

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/Catalog');
    expect(pdf).toContain('/Pages');
    expect(pdf).toContain('/Page');
    expect(pdf).toContain('/MediaBox [0 0 612 792]');
    expect(pdf).toContain('/Contents');
    expect(pdf).toContain('/Font');
    expect(pdf).toContain('/Helvetica');
    expect(pdf).toContain('/Helvetica-Bold');
    expect(pdf).toContain('/Helvetica-Oblique');
    expect(pdf).toContain('/Helvetica-BoldOblique');
    expect(pdf).toContain('Hello PDF');
    expect(pdf).toContain('Bold italic PDF');
    expect(pdf).toContain('/F4 14 Tf');
    expect(pdf).toContain('1 0 0 rg');
    expect(pdf).toContain('xref');
    expect(pdf).toContain('trailer');
    expect(pdf).toContain('startxref');
    expect(pdf.trim().endsWith('%%EOF')).toBe(true);
  });

  it('exports an editor document to an application/pdf blob with paragraph text and basic inline styles', async () => {
    const document: EditorDocument = {
      id: 'pdf-smoke-document',
      sections: [
        {
          id: 'section-1',
          pageSettings: {
            width: 816,
            height: 1056,
            orientation: 'portrait',
            margins: {
              top: 96,
              right: 96,
              bottom: 96,
              left: 96,
              header: 48,
              footer: 48,
              gutter: 0,
            },
          },
          blocks: [
            {
              id: 'paragraph-1',
              type: 'paragraph',
              runs: [{ id: 'run-1', text: 'Smoke test' }],
            },
            {
              id: 'paragraph-2',
              type: 'paragraph',
              runs: [
                { id: 'run-2', text: 'Second ', styles: { bold: true, underline: true, highlight: '#ffff00' } },
                { id: 'run-3', text: 'paragraph', styles: { italic: true, strike: true, color: '#ff0000', fontSize: 20 } },
              ],
            },
            {
              id: 'paragraph-3',
              type: 'paragraph',
              style: { align: 'center' },
              runs: [{ id: 'run-4', text: 'Centered' }],
            },
            {
              id: 'paragraph-4',
              type: 'paragraph',
              style: { align: 'right' },
              runs: [{ id: 'run-5', text: 'Right aligned' }],
            },
            {
              id: 'paragraph-5',
              type: 'paragraph',
              style: {
                spacingBefore: 8,
                spacingAfter: 16,
                indentLeft: 48,
                indentRight: 24,
                indentFirstLine: 24,
              },
              runs: [{ id: 'run-6', text: 'Indented paragraph' }],
            },
            {
              id: 'paragraph-6',
              type: 'paragraph',
              style: { indentLeft: 48, indentHanging: 24 },
              runs: [{ id: 'run-7', text: 'Hanging paragraph' }],
            },
            {
              id: 'paragraph-7',
              type: 'paragraph',
              list: { kind: 'bullet' },
              runs: [{ id: 'run-8', text: 'Bullet item' }],
            },
            {
              id: 'paragraph-8',
              type: 'paragraph',
              list: { kind: 'ordered', startAt: 3 },
              runs: [{ id: 'run-9', text: 'Ordered item' }],
            },
            {
              id: 'paragraph-9',
              type: 'paragraph',
              list: { kind: 'ordered', format: 'upperLetter' },
              runs: [{ id: 'run-10', text: 'Letter item' }],
            },
          ],
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expect(blob.type).toBe('application/pdf');
    expect(blob.size).toBeGreaterThan(0);
    expect(pdf.startsWith('%PDF-1.4')).toBe(true);
    expect(pdf).toContain('/MediaBox [0 0 612 792]');
    expect(pdf).not.toContain('Oasis PDF section');
    expect(pdf).toContain('Smoke test');
    expect(pdf).toContain('Second ');
    expect(pdf).toContain('paragraph');
    expect(pdf).toContain('Centered');
    expect(pdf).toContain('Right aligned');
    expect(pdf).toContain('Indented paragraph');
    expect(pdf).toContain('Hanging paragraph');
    expect(pdf).toContain('Bullet item');
    expect(pdf).toContain('Ordered item');
    expect(pdf).toContain('Letter item');
    expect(pdf).toContain('(•) Tj');
    expect(pdf).toContain('(3.) Tj');
    expect(pdf).toContain('(A.) Tj');
    expect(pdf).not.toContain('(4.) Tj');
    expect(pdf).toContain('/F2 11.25 Tf');
    expect(pdf).toContain('/F3 15 Tf');
    expect(pdf).toContain('1 0 0 rg');
    expect(pdf).toContain('1 1 0 rg');
    expect(pdf).toContain('282.6 688 Td');
    expect(pdf).toContain('463.95 672 Td');
    expect(pdf).toContain('126 650 Td');
    expect(pdf).toContain('90 622 Td');
    expect((pdf.match(/\nS\nQ/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it('creates additional pages when paragraphs overflow the section content area', async () => {
    const document: EditorDocument = {
      id: 'pdf-overflow-document',
      sections: [
        {
          id: 'section-1',
          pageSettings: {
            width: 816,
            height: 240,
            orientation: 'portrait',
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          blocks: Array.from({ length: 12 }, (_, index) => ({
            id: `overflow-paragraph-${index + 1}`,
            type: 'paragraph' as const,
            runs: [{ id: `overflow-run-${index + 1}`, text: `Overflow paragraph ${index + 1}` }],
          })),
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expect(blob.type).toBe('application/pdf');
    expect(pdf).toContain('/Count 2');
    expect((pdf.match(/\/Type \/Page\n/g) ?? []).length).toBe(2);
    expect(pdf).toContain('Overflow paragraph 1');
    expect(pdf).toContain('Overflow paragraph 12');
    expect(pdf).not.toContain('Oasis PDF section');
  });

  it('renders section headers and footers on every generated page with total page count', async () => {
    const document: EditorDocument = {
      id: 'pdf-header-footer-document',
      sections: [
        {
          id: 'section-1',
          pageSettings: {
            width: 816,
            height: 240,
            orientation: 'portrait',
            margins: {
              top: 48,
              right: 48,
              bottom: 48,
              left: 48,
              header: 24,
              footer: 24,
              gutter: 0,
            },
          },
          header: [
            {
              id: 'header-paragraph',
              type: 'paragraph',
              runs: [{ id: 'header-run', text: 'Document header' }],
            },
          ],
          footer: [
            {
              id: 'footer-paragraph',
              type: 'paragraph',
              runs: [
                { id: 'footer-label', text: 'Page ' },
                { id: 'footer-page', text: '', field: { type: 'PAGE' } },
                { id: 'footer-of', text: ' of ' },
                { id: 'footer-total', text: '', field: { type: 'NUMPAGES' } },
              ],
            },
          ],
          blocks: Array.from({ length: 12 }, (_, index) => ({
            id: `body-paragraph-${index + 1}`,
            type: 'paragraph' as const,
            runs: [{ id: `body-run-${index + 1}`, text: `Body paragraph ${index + 1}` }],
          })),
        },
      ],
    };

    const blob = await exportEditorDocumentToPdfBlob(document);
    const pdf = await blob.text();

    expect(blob.type).toBe('application/pdf');
    expect(pdf).toContain('/Count 2');
    expect((pdf.match(/Document header/g) ?? []).length).toBe(2);
    expect((pdf.match(/Page /g) ?? []).length).toBe(2);
    expect((pdf.match(/ of /g) ?? []).length).toBe(2);
    expect(pdf).toContain('(1) Tj');
    expect((pdf.match(/\(2\) Tj/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
