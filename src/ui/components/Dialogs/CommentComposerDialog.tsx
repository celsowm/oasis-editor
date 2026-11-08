import { createEffect, createSignal, createUniqueId, Show, type JSX } from "solid-js";
import { useI18n } from "@/i18n/I18nContext.js";
import { TextField } from "@/ui/public/TextField.js";
import { Button } from "@/ui/public/Button.js";
import type { EditorCommentComposer } from "@/ui/app/createEditorCommentComposer.js";
import { Dialog } from "./Dialog.js";

export interface CommentComposerDialogProps {
  composer: EditorCommentComposer;
}

/** Dialog state is local to the mounted editor. */
export function CommentComposerDialog(props: CommentComposerDialogProps): JSX.Element {
  const t = useI18n();
  const bodyId = createUniqueId();
  const [author, setAuthor] = createSignal("");
  const [body, setBody] = createSignal("");
  let bodyRef: HTMLTextAreaElement | undefined;
  const pending = props.composer.draft;
  const valid = (): boolean => author().trim().length > 0 && body().trim().length > 0;
  const submit = (): void => {
    if (valid()) props.composer.submit(author(), body());
  };

  createEffect((): void => {
    if (!pending()) return;
    setAuthor(props.composer.lastAuthor());
    setBody("");
    queueMicrotask((): void => bodyRef?.focus());
  });

  return (
    <Dialog
      isOpen={pending() !== null}
      title={t(pending()?.mode === "reply" ? "toolbar.replyComment" : "toolbar.newComment")}
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
            <strong>{t("comment.replyTo")} {pending()?.parentAuthor}</strong>
            <p>{pending()?.parentText}</p>
          </div>
        </Show>
        <TextField
          label={t("comment.author")}
          value={author()}
          onChange={setAuthor}
          maxLength={150}
          required
          data-testid="comment-composer-author"
        />
        <label class="oasis-editor-ui-field" for={bodyId}>
          <span class="oasis-editor-ui-field-label">{t("comment.body")}</span>
          <textarea
            ref={bodyRef}
            id={bodyId}
            class="oasis-editor-ui-input oasis-editor-comment-composer-textarea"
            value={body()}
            onInput={(e): void => { setBody(e.currentTarget.value); }}
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
        </label>
      </div>
    </Dialog>
  );
}
