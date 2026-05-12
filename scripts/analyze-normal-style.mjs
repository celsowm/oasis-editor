// Debug: verificar valores importados do DOCX
import JSZip from "jszip";
import fs from "fs";
import { DOMParser } from "@xmldom/xmldom";

const WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const TWIPS_PER_INCH = 1440;
const PX_PER_INCH = 96;

function twipsToPx(value) {
  const parsed = value ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed / TWIPS_PER_INCH) * PX_PER_INCH);
}

function getFirstChildByTagNameNS(parent, ns, tag) {
  if (!parent) return null;
  const children = parent.getElementsByTagNameNS(ns, tag);
  return children.length > 0 ? children[0] : null;
}

function getAttributeValue(element, attr) {
  if (!element) return null;
  return element.getAttribute(attr) || null;
}

async function analyzeNormalStyle() {
  const buffer = fs.readFileSync("lorem_ipsum_complex_document.docx");
  const zip = await JSZip.loadAsync(buffer);
  
  const stylesXml = zip.file("word/styles.xml");
  if (!stylesXml) {
    console.log("Styles.xml not found");
    return;
  }
  
  const stylesContent = await stylesXml.async("text");
  const document = new DOMParser().parseFromString(stylesContent, "application/xml");
  const root = document.documentElement;
  
  // Find Normal style - try multiple approaches
  const allStyles = root.childNodes;
  function findStyles(element, depth = 0) {
    if (!element || !element.childNodes) return;
    
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 1) { // Element node
        const localName = child.localName || child.nodeName.split(':').pop();
        if (localName === 'style') {
          const styleId = child.getAttribute('w:styleId') || child.getAttribute('styleId');
          const type = child.getAttribute('w:type') || child.getAttribute('type');
          const isDefault = child.getAttribute('w:default') || child.getAttribute('default');
          
          if (type === 'paragraph' && (styleId === 'Normal' || isDefault === '1')) {
            console.log(`\n=== Style: ${styleId} (default: ${isDefault}) ===`);
            
            // Look for pPr
            for (let j = 0; j < child.childNodes.length; j++) {
              const prop = child.childNodes[j];
              const propLocalName = prop.localName || prop.nodeName.split(':').pop();
              if (propLocalName === 'pPr') {
                for (let k = 0; k < prop.childNodes.length; k++) {
                  const pProp = prop.childNodes[k];
                  const pPropName = pProp.localName || pProp.nodeName.split(':').pop();
                  if (pPropName === 'spacing') {
                    const after = pProp.getAttribute('w:after') || pProp.getAttribute('after');
                    const before = pProp.getAttribute('w:before') || pProp.getAttribute('before');
                    const line = pProp.getAttribute('w:line') || pProp.getAttribute('line');
                    console.log("Spacing:", {
                      before: before ? `${before} twips = ${twipsToPx(before)}px` : "not set",
                      after: after ? `${after} twips = ${twipsToPx(after)}px` : "not set",
                      line: line ? `${line} twips` : "not set",
                    });
                  }
                  if (pPropName === 'ind') {
                    const left = pProp.getAttribute('w:left') || pProp.getAttribute('left');
                    const firstLine = pProp.getAttribute('w:firstLine') || pProp.getAttribute('firstLine');
                    console.log("Indent:", {
                      left: left ? `${left} twips = ${twipsToPx(left)}px` : "not set",
                      firstLine: firstLine ? `${firstLine} twips = ${twipsToPx(firstLine)}px` : "not set",
                    });
                  }
                }
              }
              if (propLocalName === 'rPr') {
                for (let k = 0; k < prop.childNodes.length; k++) {
                  const rProp = prop.childNodes[k];
                  const rPropName = rProp.localName || rProp.nodeName.split(':').pop();
                  if (rPropName === 'sz') {
                    const val = rProp.getAttribute('w:val') || rProp.getAttribute('val');
                    console.log("Font size:", `${val} half-points = ${Number(val) / 2}pt`);
                  }
                }
              }
            }
          }
        }
        findStyles(child, depth + 1);
      }
    }
  }
  
  findStyles(root);
  
  // Check pPrDefault
  function findDocDefaults(element) {
    if (!element || !element.childNodes) return;
    
    for (let i = 0; i < element.childNodes.length; i++) {
      const child = element.childNodes[i];
      if (child.nodeType === 1) {
        const localName = child.localName || child.nodeName.split(':').pop();
        if (localName === 'docDefaults') {
          for (let j = 0; j < child.childNodes.length; j++) {
            const ddChild = child.childNodes[j];
            const ddLocalName = ddChild.localName || ddChild.nodeName.split(':').pop();
            if (ddLocalName === 'pPrDefault') {
              console.log("\n=== pPrDefault ===");
              for (let k = 0; k < ddChild.childNodes.length; k++) {
                const pPrChild = ddChild.childNodes[k];
                const pPrLocalName = pPrChild.localName || pPrChild.nodeName.split(':').pop();
                if (pPrLocalName === 'pPr') {
                  for (let l = 0; l < pPrChild.childNodes.length; l++) {
                    const spacing = pPrChild.childNodes[l];
                    const spacingName = spacing.localName || spacing.nodeName.split(':').pop();
                    if (spacingName === 'spacing') {
                      const after = spacing.getAttribute('w:after') || spacing.getAttribute('after');
                      const before = spacing.getAttribute('w:before') || spacing.getAttribute('before');
                      const line = spacing.getAttribute('w:line') || spacing.getAttribute('line');
                      console.log("Spacing:", {
                        before: before ? `${before} twips = ${twipsToPx(before)}px` : "not set",
                        after: after ? `${after} twips = ${twipsToPx(after)}px` : "not set",
                        line: line ? `${line} twips` : "not set",
                      });
                    }
                  }
                }
              }
            }
          }
        }
        findDocDefaults(child);
      }
    }
  }
  
  findDocDefaults(root);
}

analyzeNormalStyle().catch(console.error);
