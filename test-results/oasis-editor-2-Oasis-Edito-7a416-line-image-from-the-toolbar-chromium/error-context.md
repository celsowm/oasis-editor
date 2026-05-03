# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: oasis-editor-2.spec.ts >> Oasis Editor 2 smoke tests >> inserts and selects an inline image from the toolbar
- Location: e2e\oasis-editor-2.spec.ts:89:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid="editor-2-image-resize-handle"]')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('[data-testid="editor-2-image-resize-handle"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e5]:
    - generic [ref=e6]:
      - button "File" [ref=e10] [cursor=pointer]:
        - img [ref=e11]
        - generic [ref=e14]: File
        - img [ref=e15]
      - generic [ref=e20]:
        - button "Undo last change" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
        - button "Redo last undone change" [disabled] [ref=e25]:
          - img [ref=e26]
      - generic [ref=e32]:
        - combobox "Paragraph Style" [ref=e33] [cursor=pointer]:
          - option "Normal" [selected]
          - option "Heading 1"
          - option "Heading 2"
          - option "Heading 3"
        - combobox [disabled] [ref=e34]:
          - option "Font" [selected]
          - option "Georgia"
          - option "Inter"
          - option "Times New Roman"
          - option "Courier New"
        - combobox [disabled] [ref=e35]:
          - option "Size" [selected]
          - option "14"
          - option "16"
          - option "18"
          - option "20"
          - option "24"
          - option "28"
        - generic "Text Color" [ref=e36]:
          - img [ref=e37]
          - textbox [disabled] [ref=e39] [cursor=pointer]: "#111827"
        - generic "Highlight Color" [ref=e40]:
          - img [ref=e41]
          - textbox [disabled] [ref=e44] [cursor=pointer]: "#fef08a"
      - generic [ref=e48]:
        - button "B" [disabled] [ref=e49]:
          - img [ref=e50]
        - button "I" [disabled] [ref=e52]:
          - img [ref=e53]
        - button "U" [disabled] [ref=e55]:
          - img [ref=e56]
        - button "S" [disabled] [ref=e58]:
          - img [ref=e59]
        - button "Sup" [disabled] [ref=e62]:
          - img [ref=e63]
        - button "Sub" [disabled] [ref=e67]:
          - img [ref=e68]
    - button "More tools" [ref=e76] [cursor=pointer]:
      - img [ref=e77]
      - img [ref=e81]
  - generic [ref=e83]:
    - generic [ref=e85]:
      - generic [ref=e87]:
        - paragraph [ref=e93]
        - textbox "Editor input" [active]
      - generic [ref=e101]: 1 caractere
    - complementary [ref=e102]:
      - generic [ref=e103]:
        - heading "Paragraph Properties" [level=3] [ref=e104]
        - generic [ref=e105]:
          - button "Page Break" [ref=e106] [cursor=pointer]:
            - img [ref=e107]
            - generic [ref=e111]: Page Break
          - button "Keep Next" [ref=e112] [cursor=pointer]:
            - img [ref=e113]
            - generic [ref=e116]: Keep Next
        - generic [ref=e117]:
          - generic [ref=e118]:
            - generic "Line Height" [ref=e119]: Line
            - spinbutton [ref=e120]: "1.6"
          - generic [ref=e121]:
            - generic "Spacing Before" [ref=e122]: Before
            - spinbutton [ref=e123]: "0"
          - generic [ref=e124]:
            - generic "Spacing After" [ref=e125]: After
            - spinbutton [ref=e126]: "0"
          - generic [ref=e127]:
            - generic "Left Indent" [ref=e128]: Indent
            - spinbutton [ref=e129]: "0"
          - generic [ref=e130]:
            - generic "First Line Indent" [ref=e131]: First
            - spinbutton [ref=e132]: "0"
          - generic [ref=e133]:
            - generic "Hanging Indent" [ref=e134]: Hang
            - spinbutton [ref=e135]: "0"
        - generic [ref=e136]:
          - generic "Paragraph Background Color" [ref=e137]:
            - generic [ref=e138]: Para BG
            - textbox "Para BG" [ref=e139] [cursor=pointer]: "#ffffff"
          - button "Para Borders" [ref=e140] [cursor=pointer]:
            - img [ref=e141]
            - generic [ref=e142]: Para Borders
```

# Test source

```ts
  2   | 
  3   | const SAMPLE_PNG = Buffer.from(
  4   |   "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  5   |   "base64",
  6   | );
  7   | 
  8   | async function ensureToolbarVisible(page: import("@playwright/test").Page, testId: string) {
  9   |   const target = page.locator(`[data-testid="${testId}"]`);
  10  |   if (!(await target.isVisible().catch(() => false))) {
  11  |     const overflow = page.locator('[data-testid="editor-2-toolbar-overflow-dropdown"]');
  12  |     if (await overflow.isVisible().catch(() => false)) {
  13  |       await overflow.click();
  14  |     }
  15  |   }
  16  |   return target;
  17  | }
  18  | 
  19  | async function openInsertDropdown(page: import("@playwright/test").Page) {
  20  |   const dropdown = await ensureToolbarVisible(page, "editor-2-toolbar-insert-dropdown");
  21  |   await dropdown.click();
  22  | }
  23  | 
  24  | async function clickToolbarLink(page: import("@playwright/test").Page) {
  25  |   const link = await ensureToolbarVisible(page, "editor-2-toolbar-link");
  26  |   await link.click();
  27  | }
  28  | 
  29  | async function pastePlainText(page: import("@playwright/test").Page, text: string) {
  30  |   await page.evaluate((value) => {
  31  |     const input = document.querySelector('[data-testid="editor-2-input"]') as HTMLTextAreaElement | null;
  32  |     if (!input) {
  33  |       throw new Error("Editor input not found");
  34  |     }
  35  | 
  36  |     const clipboardData = new DataTransfer();
  37  |     clipboardData.setData("text/plain", value);
  38  |     const event = new ClipboardEvent("paste", {
  39  |       bubbles: true,
  40  |       cancelable: true,
  41  |       clipboardData,
  42  |     });
  43  |     input.dispatchEvent(event);
  44  |   }, text);
  45  | }
  46  | 
  47  | test.describe("Oasis Editor 2 smoke tests", () => {
  48  |   test.beforeEach(async ({ page }) => {
  49  |     page.on("console", (msg) => {
  50  |       if (msg.type() === "error") {
  51  |         console.error(`BROWSER ERROR: ${msg.text()}`);
  52  |       }
  53  |     });
  54  | 
  55  |     await page.goto("/oasis-editor-2/");
  56  |     await page.waitForSelector("#oasis-editor-2-loading", { state: "detached" });
  57  |   });
  58  | 
  59  |   test("loads the v2 shell and accepts typing", async ({ page }) => {
  60  |     await expect(page.locator(".oasis-editor-2-app")).toBeVisible();
  61  |     await expect(page.locator('[data-testid="editor-2-page"]')).toHaveCount(1);
  62  |     await expect(page.locator('[data-testid="editor-2-block"]').first()).toBeVisible();
  63  | 
  64  |     const input = page.locator('[data-testid="editor-2-input"]');
  65  |     await input.focus();
  66  |     await page.keyboard.type("hello");
  67  | 
  68  |     await expect(page.locator('[data-testid="editor-2-block"]')).toContainText("hello");
  69  |   });
  70  | 
  71  |   test("moves the caret from a click and inserts at the clicked offset", async ({ page }) => {
  72  |     const input = page.locator('[data-testid="editor-2-input"]');
  73  |     await input.focus();
  74  |     await page.keyboard.type("ab");
  75  | 
  76  |     const chars = page.locator('[data-testid="editor-2-char"]');
  77  |     const firstChar = chars.first();
  78  |     const box = await firstChar.boundingBox();
  79  |     if (!box) {
  80  |       throw new Error("Could not measure the first character");
  81  |     }
  82  | 
  83  |     await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  84  |     await page.keyboard.type("X");
  85  | 
  86  |     await expect(page.locator('[data-testid="editor-2-block"]')).toContainText("aXb");
  87  |   });
  88  | 
  89  |   test("inserts and selects an inline image from the toolbar", async ({ page }) => {
  90  |     await openInsertDropdown(page);
  91  |     await page.locator('[data-testid="editor-2-toolbar-insert-image"]').click();
  92  |     await page.locator('[data-testid="editor-2-insert-image-input"]').setInputFiles({
  93  |       name: "inline.png",
  94  |       mimeType: "image/png",
  95  |       buffer: SAMPLE_PNG,
  96  |     });
  97  | 
  98  |     const image = page.locator('[data-testid="editor-2-image"]');
  99  |     await expect(image).toBeVisible();
  100 | 
  101 |     await image.click();
> 102 |     await expect(page.locator('[data-testid="editor-2-image-resize-handle"]')).toBeVisible();
      |                                                                                ^ Error: expect(locator).toBeVisible() failed
  103 |   });
  104 | 
  105 |   test("inserts a table and moves between cells with tab", async ({ page }) => {
  106 |     await openInsertDropdown(page);
  107 |     await page.locator('[data-testid="editor-2-toolbar-insert-table"]').click();
  108 |     await expect(page.locator('[data-testid="editor-2-table-cell"]')).toHaveCount(9);
  109 | 
  110 |     const input = page.locator('[data-testid="editor-2-input"]');
  111 |     await input.focus();
  112 |     await page.keyboard.type("A1");
  113 |     await page.keyboard.press("Tab");
  114 |     await page.keyboard.type("B1");
  115 | 
  116 |     const cells = page.locator('[data-testid="editor-2-table-cell"]');
  117 |     await expect(cells.nth(0)).toContainText("A1");
  118 |     await expect(cells.nth(1)).toContainText("B1");
  119 |   });
  120 |   test("creates and edits a link through the prompt flow", async ({ page }) => {
  121 |     await page.locator('[data-testid="editor-2-input"]').focus();
  122 |     await page.keyboard.type("link");
  123 |     await page.keyboard.down("Shift");
  124 |     await page.keyboard.press("ArrowLeft");
  125 |     await page.keyboard.press("ArrowLeft");
  126 |     await page.keyboard.press("ArrowLeft");
  127 |     await page.keyboard.press("ArrowLeft");
  128 |     await page.keyboard.up("Shift");
  129 | 
  130 |     await clickToolbarLink(page);
  131 |     await page.locator('[data-testid="editor-2-link-dialog-input"]').fill("https://example.com");
  132 |     await page.locator('[data-testid="editor-2-link-dialog-apply"]').click();
  133 | 
  134 |     const link = page.locator('[data-testid="editor-2-link"]');
  135 |     await expect(link).toHaveAttribute("href", "https://example.com");
  136 | 
  137 |     await page.keyboard.press("ArrowLeft");
  138 |     await clickToolbarLink(page);
  139 |     await page.locator('[data-testid="editor-2-link-dialog-input"]').fill("https://edited.example.com");
  140 |     await page.locator('[data-testid="editor-2-link-dialog-apply"]').click();
  141 | 
  142 |     await expect(link).toHaveAttribute("href", "https://edited.example.com");
  143 |     const unlink = await ensureToolbarVisible(page, "editor-2-toolbar-unlink");
  144 |     await expect(unlink).toBeEnabled();
  145 |   });
  146 | 
  147 |   test("applies inline formatting shortcuts and paragraph metrics", async ({ page }) => {
  148 |     const input = page.locator('[data-testid="editor-2-input"]');
  149 |     await input.focus();
  150 |     await page.keyboard.type("style");
  151 |     await page.keyboard.down("Shift");
  152 |     await page.keyboard.press("ArrowLeft");
  153 |     await page.keyboard.press("ArrowLeft");
  154 |     await page.keyboard.press("ArrowLeft");
  155 |     await page.keyboard.press("ArrowLeft");
  156 |     await page.keyboard.press("ArrowLeft");
  157 |     await page.keyboard.up("Shift");
  158 | 
  159 |     const mod = process.platform === "darwin" ? "Meta" : "Control";
  160 |     await page.keyboard.press(`${mod}+B`);
  161 |     await page.keyboard.press(`${mod}+I`);
  162 |     await page.keyboard.press(`${mod}+U`);
  163 | 
  164 |     const formattedRun = page.locator('[data-testid="editor-2-run"]').last();
  165 |     await expect(formattedRun).toHaveCSS("font-weight", "700");
  166 |     await expect(formattedRun).toHaveCSS("font-style", "italic");
  167 |     await expect.poll(async () =>
  168 |       formattedRun.evaluate((node) => getComputedStyle(node).textDecorationLine),
  169 |     ).toContain("underline");
  170 | 
  171 |     const lineHeight = page.locator('[data-testid="editor-2-toolbar-line-height"]');
  172 |     const spacingAfter = page.locator('[data-testid="editor-2-toolbar-spacing-after"]');
  173 |     const indentLeft = page.locator('[data-testid="editor-2-toolbar-indent-left"]');
  174 | 
  175 |     await lineHeight.fill("1.8");
  176 |     await lineHeight.press("Enter");
  177 |     await spacingAfter.fill("24");
  178 |     await spacingAfter.press("Enter");
  179 |     await indentLeft.fill("32");
  180 |     await indentLeft.press("Enter");
  181 | 
  182 |     const paragraph = page.locator('[data-testid="editor-2-block"]').first();
  183 |     await expect.poll(async () => paragraph.evaluate((node) => (node as HTMLElement).style.lineHeight)).toBe("1.8");
  184 |     await expect(paragraph).toHaveCSS("padding-bottom", "24px");
  185 |     await expect(paragraph).toHaveCSS("padding-left", "32px");
  186 |   });
  187 | 
  188 |   test("keeps typing after repagination and internal scroll", async ({ page }) => {
  189 |     const input = page.locator('[data-testid="editor-2-input"]');
  190 |     await input.focus();
  191 | 
  192 |     const lines = Array.from({ length: 60 }, (_, index) => `Line ${String(index + 1).padStart(2, "0")}`).join("\n");
  193 |     await pastePlainText(page, lines);
  194 | 
  195 |     await expect
  196 |       .poll(async () => page.locator('[data-testid="editor-2-page"]').count())
  197 |       .toBeGreaterThan(1);
  198 | 
  199 |     const editor = page.locator('[data-testid="editor-2-editor"]');
  200 |     await editor.evaluate((node) => {
  201 |       node.scrollTop = node.scrollHeight;
  202 |     });
```