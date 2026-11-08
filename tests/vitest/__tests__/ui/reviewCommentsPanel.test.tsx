import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import { createEditorDocument, createEditorParagraph, createEditorStateFromDocument } from "@/core/editorState.js";
import { paragraphOffsetToPosition, type EditorState } from "@/core/model.js";
import { insertCommentAtSelection, replyToComment } from "@/core/commands/commentAuthoring.js";
import { setReviewCommentResolvedById } from "@/core/commands/reviewNavigation.js";
import {
  createEditorCommentComposer,
} from "@/ui/app/createEditorCommentComposer.js";
import { ReviewCommentsPanel } from "@/ui/components/ReviewCommentsPanel.js";
import type { OasisReviewAccess } from "@/core/commands/commentPermissions.js";

function fixture() {
  const paragraph = createEditorParagraph("alpha beta");
  let state: EditorState = createEditorStateFromDocument(createEditorDocument([paragraph]));
  const choose = (from: number, to: number): void => {
    state = {
      ...state,
      selection: {
        anchor: paragraphOffsetToPosition(paragraph, from),
        focus: paragraphOffsetToPosition(paragraph, to),
      },
    };
  };
  choose(0, 5);
  state = insertCommentAtSelection(state, {
    id: "root", text: "Review scope", author: "Alice", authorId: "alice", date: 1,
  });
  state = replyToComment(state, "root", {
    id: "reply", text: "I agree", author: "Bob", authorId: "bob", date: 2,
  });
  choose(6, 10);
  state = insertCommentAtSelection(state, {
    id: "other", text: "Review remedy", author: "Alice", authorId: "alice", date: 3,
  });
  state = setReviewCommentResolvedById(state, "other", true);
  return state;
}

afterEach(() => { document.body.innerHTML = ""; });

function mount(initialAccess?: OasisReviewAccess) {
  const target = document.createElement("div");
  document.body.appendChild(target);
  const onNavigate = vi.fn();
  let setAccess!: (value: OasisReviewAccess | undefined) => void;
  let getState!: () => EditorState;
  let transactions = 0;
  const dispose = render(() => {
    const [state, update] = createSignal(fixture());
    const [access, updateAccess] = createSignal(initialAccess);
    setAccess = updateAccess;
    getState = state;
    const composer = createEditorCommentComposer({
      state,
      isReadOnly: () => false,
      applyTransactionalState: (producer): void => {
        const before = state();
        const next = producer(before);
        if (before.document !== next.document) transactions += 1;
        update(next);
      },
      focusInput: vi.fn(),
      access,
    });
    return <ReviewCommentsPanel
      state={state}
      composer={composer}
      onNavigate={onNavigate}
      onClose={vi.fn()}
    />;
  }, target);
  return {
    target, dispose, onNavigate, setAccess, getState,
    get transactions() { return transactions; },
  };
}

function byTestId(host: HTMLElement, id: string): HTMLButtonElement | null {
  return host.querySelector(`[data-testid="${id}"]`);
}

describe("review discussion drawer", () => {
  it("lists discussions, filters resolved items and navigates without document mutation", () => {
    const app = mount();
    expect(app.target.querySelectorAll(".oasis-review-thread")).toHaveLength(2);
    const original = app.getState().document;
    const resolvedFilter = [...app.target.querySelectorAll<HTMLButtonElement>(
      ".oasis-review-comments-filters button",
    )].find((button) => button.textContent?.includes("Resolved")
      || button.textContent?.includes("Resolvidos"));
    expect(resolvedFilter).toBeDefined();
    resolvedFilter!.click();
    expect(app.target.querySelectorAll(".oasis-review-thread")).toHaveLength(1);
    expect(app.target.querySelector(".oasis-review-thread")?.getAttribute("data-comment-id")).toBe("other");
    byTestId(app.target, "review-comment-navigate")?.click();
    expect(app.onNavigate).toHaveBeenCalledWith("other");
    expect(app.getState().document).toBe(original);
    app.dispose();
  });

  it("hides unauthorized owner actions and prevents deleting other users' replies", () => {
    const app = mount({ identity: { id: "alice", displayName: "Alice" } });
    const root = app.target.querySelector<HTMLElement>('.oasis-review-thread[data-comment-id="root"]')!;
    const own = app.target.querySelector<HTMLElement>('.oasis-review-thread[data-comment-id="other"]')!;
    expect(byTestId(root, "review-comment-edit")).not.toBeNull();
    expect(byTestId(root, "review-comment-delete")).toBeNull();
    expect(byTestId(own, "review-comment-delete")).not.toBeNull();
    byTestId(root, "review-toggle-replies")?.click();
    expect(byTestId(root, "review-reply-edit")).toBeNull();
    expect(byTestId(root, "review-reply-delete")).toBeNull();
    expect(app.transactions).toBe(0);
    app.dispose();
  });

  it("requires an explicit confirmation to delete a thread as a moderator", () => {
    const app = mount({ identity: { id: "moderator", displayName: "Mod" }, canModerate: true });
    const root = app.target.querySelector<HTMLElement>('.oasis-review-thread[data-comment-id="root"]')!;
    const remove = byTestId(root, "review-comment-delete")!;
    remove.click();
    expect(app.transactions).toBe(0);
    expect(app.getState().document.comments!.order).toHaveLength(3);
    remove.click();
    expect(app.transactions).toBe(1);
    expect(app.getState().document.comments!.order).toEqual(["other"]);
    app.dispose();
  });
});
