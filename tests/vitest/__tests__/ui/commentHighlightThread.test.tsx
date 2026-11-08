import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "solid-js/web";
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
    const dispose = render(
      () => (
        <CommentHighlightOverlay
          boxes={boxes}
          commentsById={() => comments}
          onReplyToComment={onReply}
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
    dispose();
  });
});
