# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: editor.spec.ts >> Oasis Editor Behavioral Tests >> should respond to toolbar actions
- Location: e2e\editor.spec.ts:86:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('#oasis-editor-loading') to be detached
    62 × locator resolved to visible <div id="oasis-editor-loading">…</div>

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
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
        - combobox "Page Template" [ref=e45] [cursor=pointer]
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
          - button "Track Changes" [ref=e75] [cursor=pointer]:
            - img [ref=e76]
        - combobox "Paragraph style" [ref=e81] [cursor=pointer]:
          - option "Normal" [selected]
          - option "Heading 1"
          - option "Heading 2"
          - option "Heading 3"
          - option "Heading 4"
          - option "Heading 5"
          - option "Heading 6"
        - generic [ref=e82]:
          - button "Align left" [ref=e83] [cursor=pointer]:
            - img [ref=e84]
          - button "Align center" [ref=e85] [cursor=pointer]:
            - img [ref=e86]
          - button "Align right" [ref=e87] [cursor=pointer]:
            - img [ref=e88]
          - button "Justify" [ref=e89] [cursor=pointer]:
            - img [ref=e90]
          - button "Bulleted list" [ref=e91] [cursor=pointer]:
            - img [ref=e92]
          - button "Numbered list" [ref=e93] [cursor=pointer]:
            - img [ref=e94]
          - button "Decrease indent" [ref=e97] [cursor=pointer]:
            - img [ref=e98]
          - button "Increase indent" [ref=e100] [cursor=pointer]:
            - img [ref=e101]
        - generic [ref=e104]:
          - button "Insert Image" [ref=e105] [cursor=pointer]:
            - img [ref=e106]
          - button "Insert Table" [ref=e110] [cursor=pointer]:
            - img [ref=e111]
      - button "More options" [ref=e113] [cursor=pointer]:
        - img [ref=e114]
    - main [ref=e118]
    - textbox [ref=e121]
    - contentinfo [ref=e122]:
      - generic [ref=e123]: Initializing...
      - generic [ref=e124]: Revision 0 • 0 pages
  - generic [ref=e127]: Loading editor...
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
> 14  |     await page.waitForSelector('#oasis-editor-loading', { state: 'detached' });
      |                ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
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
  39  |     await expect(underlineButton).not.toHaveClass(/active/);
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