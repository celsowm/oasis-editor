import { XMLSerializer, type Element as XmlElement } from "@xmldom/xmldom";
import type { EditorSdtBlockWrapper } from "@/core/model.js";
import { createEditorNodeId } from "@/core/editorState.js";
import { getMarkupCompatibleChildren } from "./markupCompatibility.js";
import {
  WORD_NS,
  getFirstChildByTagNameNS,
} from "./xmlHelpers.js";
import { parseSdtPr } from "./contentControls.js";

export interface SdtWrappedWordChild {
  element: XmlElement;
  sdtWrappers?: EditorSdtBlockWrapper[];
}

function collectSdtWrappedWordChildrenImpl(
  container: XmlElement,
  localName: string,
  inheritedWrappers: EditorSdtBlockWrapper[],
  result: SdtWrappedWordChild[],
): void {
  for (const child of getMarkupCompatibleChildren(container)) {
    if (child.namespaceURI !== WORD_NS) {
      continue;
    }
    if (child.localName === localName) {
      result.push({
        element: child,
        ...(inheritedWrappers.length > 0
          ? { sdtWrappers: inheritedWrappers }
          : {}),
      });
      continue;
    }
    if (child.localName !== "sdt") {
      continue;
    }

    const content = getFirstChildByTagNameNS(child, WORD_NS, "sdtContent");
    if (!content) {
      continue;
    }
    const properties = getFirstChildByTagNameNS(child, WORD_NS, "sdtPr");
    const endProperties = getFirstChildByTagNameNS(child, WORD_NS, "sdtEndPr");
    const wrapper: EditorSdtBlockWrapper = {
      groupId: createEditorNodeId("sdt"),
      sdtPr: parseSdtPr(properties),
      ...(endProperties
        ? { sdtEndPrXml: new XMLSerializer().serializeToString(endProperties) }
        : {}),
    };
    collectSdtWrappedWordChildrenImpl(
      content,
      localName,
      [...inheritedWrappers, wrapper],
      result,
    );
  }
}

/**
 * Collects direct Word children while transparently unwrapping any intervening
 * `w:sdt/w:sdtContent` containers. Wrapper metadata is returned outermost-first
 * so the canonical exporter can rebuild nested structural content controls.
 */
export function collectSdtWrappedWordChildren(
  container: XmlElement,
  localName: string,
): SdtWrappedWordChild[] {
  const result: SdtWrappedWordChild[] = [];
  collectSdtWrappedWordChildrenImpl(container, localName, [], result);
  return result;
}
