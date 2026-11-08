import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import type { EditorComment } from "@/core/model.js";
import { CommentHighlightOverlay } from "@/ui/components/CommentHighlightOverlay.js";

const comments: Record<string, EditorComment> = {
  root: { id: "root", author: "Alice", text: "Please review" },
  reply: { id: "reply", author: "Bob", text: "Done", parentId: "root" },
  nested: { id: "nested", author: "Carol", text: "Thanks", parentId: "reply" },
};
const boxes = () => [{ commentId: "root", left: 12, top: 20, width: 55, height: 12 }];

afterEach(() => { document.body.innerHTML = ""; });

describe("highlighted comment thread popup", () => {
  it("renders replies and dispatches a reply to the clicked comment ID", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const onReply = vi.fn();
    const onEdit = vi.fn();
    const dispose = render(
      () => (
        <CommentHighlightOverlay
          boxes={boxes}
          commentsById={() => comments}
          onReplyToComment={onReply}
          onEditComment={onEdit}
        />
      ),
      container,
    );

    const highlight = container.querySelector<HTMLSpanElement>(
      "[data-testid='editor-comment-highlight']",
    );
    expect(highlight).not.toBeNull();
    highlight!.focus();
    const popup = container.querySelector("[data-testid='editor-comment-popup']");
    expect(popup).not.toBeNull();
    expect(popup?.textContent).toContain("Please review");
    expect(popup?.textContent).toContain("Done");
    expect(popup?.textContent).toContain("Thanks");
    expect(container.querySelectorAll(".oasis-editor-comment-popup-reply"))
      .toHaveLength(2);

    const replyButton = container.querySelector<HTMLButtonElement>(
      "[data-testid='comment-popup-reply']",
    );
    expect(replyButton).not.toBeNull();
    replyButton!.click();
    expect(onReply).toHaveBeenCalledWith("root");
    const editButton = container.querySelector<HTMLButtonElement>(
      "[data-testid='comment-popup-edit']",
    );
    expect(editButton).not.toBeNull();
    editButton!.click();
    expect(onEdit).toHaveBeenCalledWith("root");
    dispose();
  });

  it("collapses long threads and edits an individual nested answer by id", () => {
    const longThread: Record<string, EditorComment> = {
      ...comments,
      a4: { id: "a4", author: "Dave", text: "Fourth", parentId: "root" },
      a5: { id: "a5", author: "Eve", text: "Fifth", parentId: "root" },
      a6: { id: "a6", author: "Fox", text: "Sixth", parentId: "root" },
    };
    const host = document.createElement("div");
    document.body.appendChild(host);
    const onEdit = vi.fn();
    const onReply = vi.fn();
    const dispose = render(
      () => (
        <CommentHighlightOverlay
          boxes={boxes}
          commentsById={() => longThread}
          onEditComment={onEdit}
          onReplyToComment={onReply}
        />
      ), host,
    );
    host.querySelector<HTMLSpanElement>("[data-testid='editor-comment-highlight']")!.focus();
    expect(host.querySelectorAll(".oasis-editor-comment-popup-reply")).toHaveLength(3);
    const expand = host.querySelector<HTMLButtonElement>(
      "[data-testid='comment-popup-expand-replies']",
    )!;
    expect(expand.getAttribute("aria-expanded")).toBe("false");
    expand.click();
    expect(expand.getAttribute("aria-expanded")).toBe("true");
    expect(host.querySelectorAll(".oasis-editor-comment-popup-reply")).toHaveLength(5);
    const nested = host.querySelector<HTMLElement>(
      ".oasis-editor-comment-popup-reply[data-comment-id='nested']",
    )!;
    nested.querySelector<HTMLButtonElement>(
      "[data-testid='comment-popup-edit-reply']",
    )!.click();
    expect(onEdit).toHaveBeenCalledWith("nested");
    nested.querySelector<HTMLButtonElement>(
      "[data-testid='comment-popup-reply-to-reply']",
    )!.click();
    expect(onReply).toHaveBeenCalledWith("nested");
    expand.click();
    expect(host.querySelectorAll(".oasis-editor-comment-popup-reply")).toHaveLength(3);
    dispose();
  });

  it("refreshes an open popup immediately when a comment body is edited", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    let setComments!: (value: Record<string, EditorComment>) => void;
    const dispose = render(() => {
      const [current, update] = createSignal<Record<string, EditorComment>>(comments);
      setComments = update;
      return <CommentHighlightOverlay boxes={boxes} commentsById={current} />;
    }, container);
    container.querySelector<HTMLSpanElement>(
      "[data-testid='editor-comment-highlight']",
    )!.focus();
    const popup = container.querySelector("[data-testid='editor-comment-popup']");
    expect(popup?.textContent).toContain("Please review");
    setComments({ ...comments, root: { ...comments.root!, text: "Edited in place" } });
    expect(popup?.textContent).toContain("Edited in place");
    expect(popup?.textContent).not.toContain("Please review");
    dispose();
  });

  it("does not offer edits to users in read-only mode", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const dispose = render(
      () => (
        <CommentHighlightOverlay
          boxes={boxes}
          commentsById={() => comments}
          onReplyToComment={vi.fn()}
          onEditComment={vi.fn()}
          readOnly
        />
      ),
      container,
    );
    const highlight = container.querySelector<HTMLSpanElement>(
      "[data-testid='editor-comment-highlight']",
    );
    highlight!.focus();
    expect(container.querySelector("[data-testid='editor-comment-popup']"))
      .not.toBeNull();
    expect(container.querySelector("[data-testid='comment-popup-reply']"))
      .toBeNull();
    expect(container.querySelector("[data-testid='comment-popup-edit']"))
      .toBeNull();
    expect(container.querySelector("[data-testid='comment-popup-edit-reply']"))
      .toBeNull();
    dispose();
  });
});
