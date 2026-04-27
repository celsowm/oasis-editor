# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor.spec.ts >> Oasis Editor Behavioral Tests >> should reflect underline state in toolbar
- Location: e2e/editor.spec.ts:19:3

# Error details

```
Error: expect(locator).not.toHaveClass(expected) failed

Locator: locator('#oasis-editor-underline')
Expected pattern: not /active/
Received string: "active"
Timeout: 5000ms

Call log:
  - Expect "not toHaveClass" with timeout 5000ms
  - waiting for locator('#oasis-editor-underline')
    9 × locator resolved to <button type="button" class="active" data-command="underline" title="Underline (Ctrl+U)" id="oasis-editor-underline">…</button>
      - unexpected value "active"

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e7]:
      - textbox [ref=e8]: Untitled document
      - generic [ref=e9]:
        - generic [ref=e10]: File
        - generic [ref=e11]: Edit
        - generic [ref=e12]: Insert
        - generic [ref=e13]: Format
  - generic [ref=e14]:
    - generic [ref=e15]:
      - generic [ref=e16]:
        - button "Undo (Ctrl+Z)" [ref=e17] [cursor=pointer]:
          - img [ref=e18]
        - button "Redo (Ctrl+Y)" [ref=e21] [cursor=pointer]:
          - img [ref=e22]
        - button "Print" [ref=e25] [cursor=pointer]:
          - img [ref=e26]
      - button "Format Painter" [ref=e32] [cursor=pointer]:
        - img [ref=e33]
      - combobox [ref=e39] [cursor=pointer]:
        - option "100%" [selected]
        - option "Fit"
      - combobox "Font family" [ref=e42] [cursor=pointer]:
        - option "Inter" [selected]
        - option "Roboto"
        - option "Arial"
        - option "Times New Roman"
        - option "Courier New"
        - option "Georgia"
        - option "Verdana"
      - combobox "Page Template" [ref=e45] [cursor=pointer]:
        - option "A4 Default" [selected]
        - option "Letter Default"
      - generic [ref=e47]:
        - button "Bold (Ctrl+B)" [ref=e48] [cursor=pointer]:
          - img [ref=e49]
        - button "Italic (Ctrl+I)" [ref=e51] [cursor=pointer]:
          - img [ref=e52]
        - button "Underline (Ctrl+U)" [ref=e54] [cursor=pointer]:
          - img [ref=e55]
        - button "Strikethrough" [ref=e57] [cursor=pointer]:
          - img [ref=e58]
        - button "Superscript" [ref=e61] [cursor=pointer]:
          - img [ref=e62]
        - button "Subscript" [ref=e66] [cursor=pointer]:
          - img [ref=e67]
        - button "Insert Link" [ref=e71] [cursor=pointer]:
          - img [ref=e72]
        - button "▼" [ref=e77] [cursor=pointer]:
          - img [ref=e80]
          - generic [ref=e83]: ▼
        - button "Track Changes" [ref=e84] [cursor=pointer]:
          - img [ref=e85]
      - combobox "Paragraph style" [ref=e90] [cursor=pointer]:
        - option "Normal" [selected]
        - option "Heading 1"
        - option "Heading 2"
        - option "Heading 3"
        - option "Heading 4"
        - option "Heading 5"
        - option "Heading 6"
    - button "More options" [ref=e91] [cursor=pointer]:
      - img [ref=e92]
  - main [ref=e96]:
    - generic [ref=e97]:
      - generic:
        - article
        - article [ref=e98]: UNDERLINED_TEXT NORMAL_TEXTLorem Ipsum Dolor Sit Amet
        - article [ref=e99]: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
        - article [ref=e100]: Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa.
        - article [ref=e101]: Vestibulum Lacinia
        - article [ref=e102]: Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.
        - article [ref=e103]: Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet.
        - article
  - textbox [active] [ref=e105]
  - contentinfo [ref=e106]:
    - generic [ref=e107]: Revision 27 • 1 pages
    - generic [ref=e108]: Revision 0 • 0 pages
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('Oasis Editor Behavioral Tests', () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Monitor console errors
  6   |     page.on('console', msg => {
  7   |       if (msg.type() === 'error') {
  8   |         console.error(`BROWSER ERROR: ${msg.text()}`);
  9   |       }
  10  |     });
  11  | 
  12  |     await page.goto('/');
  13  |     // Wait for loader to disappear
  14  |     await page.waitForSelector('#oasis-editor-loading', { state: 'detached' });
  15  |     // Ensure shell is visible
  16  |     await expect(page.locator('.oasis-editor-shell')).toBeVisible();
  17  |   });
  18  | 
  19  |   test('should reflect underline state in toolbar', async ({ page }) => {
  20  |     const paragraph = page.locator('.oasis-fragment--paragraph').first();
  21  |     await paragraph.click({ force: true });
  22  |     
  23  |     const underlineButton = page.locator('#oasis-editor-underline');
  24  |     
  25  |     // 1. Click underline button
  26  |     await underlineButton.click({ force: true });
  27  |     
  28  |     // 2. Type some text
  29  |     await page.keyboard.type('UNDERLINED_TEXT');
  30  |     
  31  |     // 3. Verify button is active
  32  |     await expect(underlineButton).toHaveClass(/active/);
  33  |     
  34  |     // 4. Move cursor out of underlined text (by typing without underline)
  35  |     await underlineButton.click({ force: true }); // Toggle off
  36  |     await page.keyboard.type(' NORMAL_TEXT');
  37  |     
  38  |     // 5. Verify button is NOT active
> 39  |     await expect(underlineButton).not.toHaveClass(/active/);
      |                                       ^ Error: expect(locator).not.toHaveClass(expected) failed
  40  |     
  41  |     // 6. Click back on underlined text
  42  |     const underlinedSpan = page.locator('.oasis-fragment span', { hasText: 'UNDERLINED_TEXT' });
  43  |     await underlinedSpan.click({ position: { x: 5, y: 5 } });
  44  |     
  45  |     // 7. Verify button is active again
  46  |     await expect(underlineButton).toHaveClass(/active/);
  47  |   });
  48  | 
  49  |   test('should render initial content and allow editing', async ({ page }) => {
  50  |     const pageLocator = page.locator('.oasis-page');
  51  |     await expect(pageLocator).toBeVisible();
  52  |     await expect(pageLocator).toHaveCount(1);
  53  | 
  54  |     const loremFragment = page.locator('.oasis-fragment--heading', { hasText: 'Lorem Ipsum' });
  55  |     await expect(loremFragment).toBeVisible();
  56  | 
  57  |     await loremFragment.click({ position: { x: 5, y: 5 } });
  58  |     const caret = page.locator('.oasis-caret');
  59  |     await expect(caret).toBeVisible();
  60  | 
  61  |     const testText = 'Hello World';
  62  |     await page.keyboard.type(testText);
  63  |     const newTextFragment = page.locator('.oasis-fragment', { hasText: testText });
  64  |     await expect(newTextFragment).toBeVisible();
  65  |     
  66  |     // Final debug screenshot
  67  |     await page.screenshot({ path: 'e2e-debug-final.png', fullPage: true });
  68  |   });
  69  | 
  70  |   test('should handle formatting commands', async ({ page }) => {
  71  |     const paragraph = page.locator('.oasis-fragment--paragraph').first();
  72  |     await paragraph.click({ force: true });
  73  |     await page.locator('#oasis-editor-input').focus();
  74  | 
  75  |     await page.keyboard.press('Control+B');
  76  |     await page.waitForTimeout(200);
  77  |     await page.keyboard.type('SHORTCUT_BOLD');
  78  | 
  79  |     const boldSpan = page.locator('.oasis-fragment span', { hasText: 'SHORTCUT_BOLD' });
  80  |     await expect(boldSpan).toBeVisible();
  81  |     
  82  |     const fontWeight = await boldSpan.evaluate(el => window.getComputedStyle(el).fontWeight);
  83  |     expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
  84  |   });
  85  | 
  86  |   test('should respond to toolbar actions', async ({ page }) => {
  87  |     const paragraph = page.locator('.oasis-fragment--paragraph').first();
  88  |     await paragraph.click({ force: true });
  89  |     
  90  |     const boldButton = page.locator('#oasis-editor-bold');
  91  |     await boldButton.click({ force: true });
  92  |     
  93  |     await page.waitForTimeout(200);
  94  |     await page.keyboard.type('TOOLBAR_BOLD');
  95  |     
  96  |     const boldSpan = page.locator('.oasis-fragment span', { hasText: 'TOOLBAR_BOLD' });
  97  |     await expect(boldSpan).toBeVisible();
  98  |     
  99  |     const fontWeight = await boldSpan.evaluate(el => window.getComputedStyle(el).fontWeight);
  100 |     expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
  101 |   });
  102 | });
  103 | 
```