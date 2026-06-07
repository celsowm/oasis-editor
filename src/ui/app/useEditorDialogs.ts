import { createSignal } from "solid-js";
import type { FontDialogInitialValues } from "../components/Dialogs/FontDialog.js";
import type { ParagraphDialogInitialValues } from "../components/Dialogs/ParagraphDialog.js";

export function createEditorDialogs() {
  const [linkDialog, setLinkDialog] = createSignal<{
    isOpen: boolean;
    initialHref: string;
  }>({
    isOpen: false,
    initialHref: "",
  });
  const [imageAltDialog, setImageAltDialog] = createSignal<{
    isOpen: boolean;
    initialAlt: string;
  }>({
    isOpen: false,
    initialAlt: "",
  });
  const [contextMenu, setContextMenu] = createSignal<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({ isOpen: false, x: 0, y: 0 });
  const [fontDialog, setFontDialog] = createSignal<{
    isOpen: boolean;
    initial: FontDialogInitialValues;
  }>({
    isOpen: false,
    initial: {
      fontFamily: "",
      fontSize: "",
      color: "",
      colorMode: "automatic",
      highlight: "",
      shading: "",
      bold: false,
      italic: false,
      underline: false,
      underlineStyle: null,
      underlineColor: "",
      strike: false,
      doubleStrike: false,
      superscript: false,
      subscript: false,
      smallCaps: false,
      allCaps: false,
      hidden: false,
      characterScale: "",
      characterSpacing: "",
      baselineShift: "",
      kerningThreshold: "",
      ligatures: "",
      numberSpacing: "",
      numberForm: "",
      stylisticSet: "",
      contextualAlternates: false,
    },
  });
  const [paragraphDialog, setParagraphDialog] = createSignal<{
    isOpen: boolean;
    initial: ParagraphDialogInitialValues;
  }>({
    isOpen: false,
    initial: {
      align: "",
      indentLeft: "",
      indentRight: "",
      indentFirstLine: "",
      indentHanging: "",
      spacingBefore: "",
      spacingAfter: "",
      lineHeight: "",
      shading: "",
      borderStyle: "",
      borderWidth: "",
      borderColor: "",
      borderSideTop: false,
      borderSideRight: false,
      borderSideBottom: false,
      borderSideLeft: false,
    },
  });

  return {
    linkDialog,
    setLinkDialog,
    imageAltDialog,
    setImageAltDialog,
    contextMenu,
    setContextMenu,
    fontDialog,
    setFontDialog,
    paragraphDialog,
    setParagraphDialog,
  };
}
