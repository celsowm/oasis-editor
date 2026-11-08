import { createEffect, createSignal, Show, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { TextField } from "@/ui/public/TextField.js";
import { TextAreaField } from "@/ui/public/TextAreaField.js";
import { Text } from "@/ui/public/Text.js";
import { Button } from "@/ui/public/Button.js";
import type { EditorCommentComposer } from "@/ui/app/createEditorCommentComposer.js";
import { Dialog } from "./Dialog.js";

export interface CommentComposerDialogProps {
  composer: EditorCommentComposer;
}

/** Dialog state is local to the mounted editor. */
export function CommentComposerDialog(props: CommentComposerDialogProps): JSX.Element {
  const t = useI18n();
  const [author, setAuthor] = createSignal("");
  const [body, setBody] = createSignal("");
  let bodyRef: HTMLTextAreaElement | undefined;
  const pending = props.composer.draft;
  const valid = (): boolean =>
    (pending()?.mode === "edit" || author().trim().length > 0) &&
    body().trim().length > 0;
  const submit = (): void => {
    if (valid()) props.composer.submit(author(), body());
  };

  createEffect((): void => {
    if (!pending()) return;
    setAuthor(pending()?.mode === "edit"
      ? pending()?.commentAuthor ?? ""
      : props.composer.lastAuthor());
    setBody(pending()?.mode === "edit" ? pending()?.commentText ?? "" : "");
    queueMicrotask((): void => bodyRef?.focus());
  });

  return (
    <Dialog
      isOpen={pending() !== null}
      title={t(pending()?.mode === "edit"
        ? "toolbar.editComment"
        : pending()?.mode === "reply"
          ? "toolbar.replyComment"
          : "toolbar.newComment")}
      onClose={props.composer.close}
      footer={
        <>
          <Button onClick={props.composer.close} data-testid="comment-composer-cancel">
            {t("generic.cancel")}
          </Button>
          <Button
            variant="primary"
            disabled={!valid()}
            onClick={submit}
            data-testid="comment-composer-submit"
          >
            {t("generic.save")}
          </Button>
        </>
      }
    >
      <div class="oasis-editor-comment-composer">
        <Show when={pending()?.mode === "reply"}>
          <div class="oasis-editor-comment-composer-parent" data-testid="comment-reply-context">
            <Text as="strong">{t("comment.replyTo")} {pending()?.parentAuthor}</Text>
            <Text as="p">{pending()?.parentText}</Text>
          </div>
        </Show>
        <TextField
          label={t("comment.author")}
          value={author()}
          onChange={setAuthor}
          maxLength={150}
          required
          disabled={pending()?.mode === "edit"}
          data-testid="comment-composer-author"
        />
        <TextAreaField
          ref={bodyRef}
          label={t("comment.body")}
          controlClass="oasis-editor-comment-composer-textarea"
          value={body()}
          onChange={setBody}
          onKeyDown={(e): void => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          rows={5}
          maxLength={20000}
          placeholder={t("comment.placeholder")}
          data-testid="comment-composer-body"
        />
      </div>
    </Dialog>
  );
}
