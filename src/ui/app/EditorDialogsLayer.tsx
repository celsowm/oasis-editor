import type { ComponentProps } from "solid-js";
import { LinkDialog } from "@/ui/components/Dialogs/LinkDialog.js";
import { ImageAltDialog } from "@/ui/components/Dialogs/ImageAltDialog.js";
import { ImageCaptionDialog } from "@/ui/components/Dialogs/ImageCaptionDialog.js";
import { FontDialog } from "@/ui/components/Dialogs/FontDialog.js";
import { ParagraphDialog } from "@/ui/components/Dialogs/ParagraphDialog.js";
import { TablePropertiesDialog } from "@/ui/components/Dialogs/TablePropertiesDialog.js";
import { FindReplaceDialog } from "@/ui/components/FindReplace/FindReplaceDialog.js";
import { ContextMenu } from "@/ui/components/ContextMenu/ContextMenu.js";
import type { createEditorDialogs } from "./useEditorDialogs.js";
import { JSX } from "solid-js";

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
  applyImageCaptionCommand: (caption: string) => void;
  applyFontDialogValues: ComponentProps<typeof FontDialog>["onApply"];
  applyParagraphDialogValues: ComponentProps<typeof ParagraphDialog>["onApply"];
  setParagraphDialogDefault: NonNullable<
    ComponentProps<typeof ParagraphDialog>["onSetDefault"]
  >;
  applyTablePropertiesDialogValues: ComponentProps<
    typeof TablePropertiesDialog
  >["onApply"];
  closeContextMenu: () => void;
}

/**
 * Presentational layer that mounts the editor's modal dialogs and context menu.
 * Holds no editor logic — it only binds dialog signals and command callbacks to
 * their respective UI components.
 */
export function EditorDialogsLayer(
  props: EditorDialogsLayerProps,
): JSX.Element {
  const {
    linkDialog,
    setLinkDialog,
    imageAltDialog,
    setImageAltDialog,
    imageCaptionDialog,
    setImageCaptionDialog,
    contextMenu,
    fontDialog,
    setFontDialog,
    paragraphDialog,
    setParagraphDialog,
    tablePropertiesDialog,
    setTablePropertiesDialog,
  } = props.dialogs;

  return (
    <>
      <LinkDialog
        isOpen={linkDialog().isOpen}
        initialHref={linkDialog().initialHref}
        onClose={(): void => {
          setLinkDialog({ ...linkDialog(), isOpen: false });
          props.focusInput();
        }}
        onConfirm={(href): void => props.applyLinkCommand(href.trim() || null)}
      />

      <ImageAltDialog
        isOpen={imageAltDialog().isOpen}
        initialAlt={imageAltDialog().initialAlt}
        onClose={(): void => {
          setImageAltDialog({ ...imageAltDialog(), isOpen: false });
          props.focusInput();
        }}
        onConfirm={(alt): void => props.applyImageAltCommand(alt.trim())}
      />

      <ImageCaptionDialog
        isOpen={imageCaptionDialog().isOpen}
        initialCaption={imageCaptionDialog().initialCaption}
        onClose={(): void => {
          setImageCaptionDialog({ ...imageCaptionDialog(), isOpen: false });
          props.focusInput();
        }}
        onConfirm={(caption): void =>
          props.applyImageCaptionCommand(caption.trim())
        }
      />

      <FindReplaceDialog fr={props.findReplace} />

      <FontDialog
        isOpen={fontDialog().isOpen}
        initial={fontDialog().initial}
        familyOptions={props.fontFamilyOptions()}
        sizeOptions={props.fontSizeOptions()}
        onClose={(): void => {
          setFontDialog({ ...fontDialog(), isOpen: false });
          props.focusInput();
        }}
        onApply={props.applyFontDialogValues}
      />

      <ParagraphDialog
        isOpen={paragraphDialog().isOpen}
        initial={paragraphDialog().initial}
        onClose={(): void => {
          setParagraphDialog({ ...paragraphDialog(), isOpen: false });
          props.focusInput();
        }}
        onApply={props.applyParagraphDialogValues}
        onSetDefault={props.setParagraphDialogDefault}
      />

      <TablePropertiesDialog
        isOpen={tablePropertiesDialog().isOpen}
        initial={tablePropertiesDialog().initial}
        onClose={(): void => {
          setTablePropertiesDialog({
            ...tablePropertiesDialog(),
            isOpen: false,
          });
          props.focusInput();
        }}
        onApply={props.applyTablePropertiesDialogValues}
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
