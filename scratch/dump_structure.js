import fs from 'fs';
import { DOMParser } from '@xmldom/xmldom';

function run() {
  const docXml = fs.readFileSync('scratch/document.xml', 'utf8');
  const parser = new DOMParser();
  const doc = parser.parseFromString(docXml, 'text/xml');
  
  const body = doc.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'body')[0];
  
  function getParagraphText(pNode) {
    const ts = pNode.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 't');
    let text = '';
    for (let i = 0; i < ts.length; i++) {
      text += ts[i].textContent;
    }
    return text;
  }
  
  function dumpNode(node, depth = 0) {
    const indent = '  '.repeat(depth);
    if (node.nodeType !== 1) return; // Only element nodes
    
    const localName = node.localName;
    if (localName === 'p') {
      const text = getParagraphText(node);
      const hasBrPage = node.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'br')[0]?.getAttribute('w:type') === 'page';
      const hasPageBreakBefore = node.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'pageBreakBefore')[0] !== undefined;
      const pStyle = node.getElementsByTagNameNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'pStyle')[0]?.getAttribute('w:val');
      
      let attrs = [];
      if (pStyle) attrs.push(`style=${pStyle}`);
      if (hasBrPage) attrs.push('br_page');
      if (hasPageBreakBefore) attrs.push('pageBreakBefore');
      
      console.log(`${indent}P${attrs.length ? ' [' + attrs.join(', ') + ']' : ''}: "${text}"`);
    } else if (localName === 'tbl') {
      console.log(`${indent}Table:`);
      const rows = node.childNodes;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].localName === 'tr') {
          console.log(`${indent}  Row ${i}:`);
          const cells = rows[i].childNodes;
          for (let j = 0; j < cells.length; j++) {
            if (cells[j].localName === 'tc') {
              console.log(`${indent}    Cell ${j}:`);
              const cellChildren = cells[j].childNodes;
              for (let k = 0; k < cellChildren.length; k++) {
                dumpNode(cellChildren[k], depth + 3);
              }
            }
          }
        }
      }
    }
  }
  
  const children = body.childNodes;
  for (let i = 0; i < children.length; i++) {
    dumpNode(children[i]);
  }
}

run();
