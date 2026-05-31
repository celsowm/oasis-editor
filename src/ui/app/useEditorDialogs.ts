import { createSignal } from "solid-js";
import type { FontDialogInitialValues } from "../components/Dialogs/FontDialog.js";

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
      bold: false,
      italic: false,
      underline: false,
      strike: false,
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
  };
}
