import { expect, test, type Page } from "@playwright/test";

// Mobile keyboards (GBoard) and desktop IMEs keep a whole word "in composition"
// until it is committed. The composing text must already paint on the canvas,
// otherwise nothing shows up until the user presses Enter or hides the keyboard.

async function gotoEditor(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("oasis.welcomeSeen", "1");
  });
  // Relative to baseURL, so this works against both the dev server and the
  // base-prefixed preview server.
  await page.goto("/oasis-editor/index.html", { waitUntil: "domcontentloaded" });
  await expect(
    page.locator('[data-testid="editor-page"][data-renderer="canvas"]').first(),
  ).toBeVisible({ timeout: 60_000 });
}

async function charCount(page: Page): Promise<number> {
  const raw = await page
    .locator('[data-testid="editor-statusbar-character-count"]')
    .innerText();
  const match = raw.match(/\d+/);
  return match ? Number(match[0]) : -1;
}

test("IME composition paints before it is committed", async ({ page }) => {
  await gotoEditor(page);
  const canvasPage = page
    .locator('[data-testid="editor-page"][data-renderer="canvas"]')
    .first();

  const box = await canvasPage.boundingBox();
  if (!box) throw new Error("canvas editor page not found");
  await page.mouse.click(box.x + 120, box.y + 120);
  await expect(page.locator("textarea.oasis-editor-input")).toBeFocused();

  const baseline = await charCount(page);
  const cdp = await page.context().newCDPSession(page);

  // GBoard-style: a single running composition, committed only at the end.
  await cdp.send("Input.imeSetComposition", {
    text: "ca",
    selectionStart: 2,
    selectionEnd: 2,
  });
  await expect.poll((): Promise<number> => charCount(page)).toBe(baseline + 2);

  await cdp.send("Input.imeSetComposition", {
    text: "casa",
    selectionStart: 4,
    selectionEnd: 4,
  });
  // The preview is replaced, never appended (would be "cacasa" otherwise).
  await expect.poll((): Promise<number> => charCount(page)).toBe(baseline + 4);

  await cdp.send("Input.insertText", { text: "casa" });
  await page.waitForTimeout(500);
  // Committing must not insert the text a second time.
  expect(await charCount(page)).toBe(baseline + 4);
});
