import type { JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { Text } from "@/ui/public/Text.js";
import { Dialog } from "./Dialog.js";
import { DialogFooter } from "./DialogFooter.js";

export interface RevisionBulkDialogProps {
  isOpen: boolean;
  action: "accept" | "reject";
  count: number;
  onClose: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation gate for the document-scoped Accept All / Reject All actions.
 * Word asks before applying a bulk decision, and the count makes the scope
 * explicit so it cannot be confused with the selection-scoped Accept/Reject.
 */
export function RevisionBulkDialog(
  props: RevisionBulkDialogProps,
): JSX.Element {
  const t = useI18n();
  const isAccept = (): boolean => props.action === "accept";

  return (
    <Dialog
      isOpen={props.isOpen}
      title={t(
        isAccept() ? "review.bulkAcceptTitle" : "review.bulkRejectTitle",
      )}
      onClose={props.onClose}
      closeOnOverlayClick={false}
      size="sm"
      testId="editor-revision-bulk-dialog"
      footer={
        <DialogFooter
          onCancel={props.onClose}
          onConfirm={props.onConfirm}
          cancelLabel={t("generic.cancel")}
          confirmLabel={t(
            isAccept() ? "toolbar.acceptAll" : "toolbar.rejectAll",
          )}
          cancelTestId="editor-revision-bulk-cancel"
          confirmTestId="editor-revision-bulk-confirm"
        />
      }
    >
      <Text as="p" data-testid="editor-revision-bulk-message">
        {t(
          isAccept() ? "review.bulkAcceptMessage" : "review.bulkRejectMessage",
          [props.count],
        )}
      </Text>
    </Dialog>
  );
}
