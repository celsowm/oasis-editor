import type { ComponentProps } from "solid-js";
import { LinkDialog } from "../components/Dialogs/LinkDialog.js";
import { ImageAltDialog } from "../components/Dialogs/ImageAltDialog.js";
import { FontDialog } from "../components/Dialogs/FontDialog.js";
import { ParagraphDialog } from "../components/Dialogs/ParagraphDialog.js";
import { FindReplaceDialog } from "../components/FindReplace/FindReplaceDialog.js";
import { ContextMenu } from "../components/ContextMenu/ContextMenu.js";
import type { createEditorDialogs } from "./useEditorDialogs.js";

type EditorDialogsState = ReturnType<typeof createEditorDialogs>;

export interface EditorDialogsLayerProps {
  dialogs: EditorDialogsState;
  findReplace: ComponentProps<typeof FindReplaceDialog>["fr"];
  fontFamilyOptions: () => string[];
  fontSizeOptions: () => number[];
  contextMenuItems: () => ComponentProps<typeof ContextMenu>["items"];
  focusInput: () => void;
  applyLinkCommand: (href: string | null) => void;
  applyImageAltCommand: (alt: string) => void;
  applyFontDialogValues: ComponentProps<typeof FontDialog>["onApply"];
  applyParagraphDialogValues: ComponentProps<typeof ParagraphDialog>["onApply"];
  closeContextMenu: () => void;
}

/**
 * Presentational layer that mounts the editor's modal dialogs and context menu.
 * Holds no editor logic — it only binds dialog signals and command callbacks to
 * their respective UI components.
 */
export function EditorDialogsLayer(props: EditorDialogsLayerProps) {
  const {
    linkDialog,
    setLinkDialog,
    imageAltDialog,
    setImageAltDialog,
    contextMenu,
    fontDialog,
    setFontDialog,
    paragraphDialog,
    setParagraphDialog,
  } = props.dialogs;

  return (
    <>
      <LinkDialog
        isOpen={linkDialog().isOpen}
        initialHref={linkDialog().initialHref}
        onClose={() => {
          setLinkDialog({ ...linkDialog(), isOpen: false });
          props.focusInput();
        }}
        onConfirm={(href) => props.applyLinkCommand(href.trim() || null)}
      />

      <ImageAltDialog
        isOpen={imageAltDialog().isOpen}
        initialAlt={imageAltDialog().initialAlt}
        onClose={() => {
          setImageAltDialog({ ...imageAltDialog(), isOpen: false });
          props.focusInput();
        }}
        onConfirm={(alt) => props.applyImageAltCommand(alt.trim())}
      />

      <FindReplaceDialog fr={props.findReplace} />

      <FontDialog
        isOpen={fontDialog().isOpen}
        initial={fontDialog().initial}
        familyOptions={props.fontFamilyOptions()}
        sizeOptions={props.fontSizeOptions()}
        onClose={() => {
          setFontDialog({ ...fontDialog(), isOpen: false });
          props.focusInput();
        }}
        onApply={props.applyFontDialogValues}
      />

      <ParagraphDialog
        isOpen={paragraphDialog().isOpen}
        initial={paragraphDialog().initial}
        onClose={() => {
          setParagraphDialog({ ...paragraphDialog(), isOpen: false });
          props.focusInput();
        }}
        onApply={props.applyParagraphDialogValues}
      />

      <ContextMenu
        isOpen={contextMenu().isOpen}
        x={contextMenu().x}
        y={contextMenu().y}
        items={props.contextMenuItems()}
        onClose={props.closeContextMenu}
      />
    </>
  );
}
