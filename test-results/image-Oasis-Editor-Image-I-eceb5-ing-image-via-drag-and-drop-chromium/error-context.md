# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: image.spec.ts >> Oasis Editor Image Insertion >> should move existing image via drag and drop
- Location: e2e\image.spec.ts:115:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.oasis-fragment--paragraph').first()
    - locator resolved to <article data-block-id="block:6" data-fragment-id="fragment:block:6:0" class="oasis-fragment oasis-fragment--paragraph oasis-dimmed">…</article>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <section id="oasis-editor-pages" class="oasis-editor-pages">…</section> intercepts pointer events
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <section id="oasis-editor-pages" class="oasis-editor-pages">…</section> intercepts pointer events
    - retrying click action
      - waiting 100ms
    55 × waiting for element to be visible, enabled and stable
       - element is visible, enabled and stable
       - scrolling into view if needed
       - done scrolling
       - <section id="oasis-editor-pages" class="oasis-editor-pages">…</section> intercepts pointer events
     - retrying click action
       - waiting 500ms

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
      - generic [ref=e91]:
        - button "Align left" [ref=e92] [cursor=pointer]:
          - img [ref=e93]
        - button "Align center" [ref=e94] [cursor=pointer]:
          - img [ref=e95]
        - button "Align right" [ref=e96] [cursor=pointer]:
          - img [ref=e97]
        - button "Justify" [ref=e98] [cursor=pointer]:
          - img [ref=e99]
        - button "Bulleted list" [ref=e100] [cursor=pointer]:
          - img [ref=e101]
        - button "Numbered list" [ref=e102] [cursor=pointer]:
          - img [ref=e103]
        - button "Decrease indent" [ref=e106] [cursor=pointer]:
          - img [ref=e107]
        - button "Increase indent" [ref=e109] [cursor=pointer]:
          - img [ref=e110]
      - generic [ref=e113]:
        - button "Insert Image" [ref=e114] [cursor=pointer]:
          - img [ref=e115]
        - button "Insert Table" [ref=e119] [cursor=pointer]:
          - img [ref=e120]
    - button "More options" [ref=e122] [cursor=pointer]:
      - img [ref=e123]
  - main [ref=e127]:
    - generic [ref=e128]:
      - generic:
        - article
        - article [ref=e129]: Lorem Ipsum Dolor Sit Amet
        - article [ref=e131]: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
        - article [ref=e132]: Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa.
        - article [ref=e133]: Vestibulum Lacinia
        - article [ref=e134]: Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos.
        - article [ref=e135]: Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis. Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor. Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa. Fusce ac turpis quis ligula lacinia aliquet.
        - article
        - textbox "Alt text..." [active]
  - textbox [ref=e145]
  - contentinfo [ref=e146]:
    - generic [ref=e147]: Revision 1 • 1 pages
    - generic [ref=e148]: Revision 0 • 0 pages
```

# Test source

```ts
  29  |   });
  30  | 
  31  |   test('should update alt text correctly', async ({ page }) => {
  32  |     const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  33  |     const imagePath = path.join(process.cwd(), 'test-image-alt.png');
  34  |     fs.writeFileSync(imagePath, imageBuffer);
  35  | 
  36  |     try {
  37  |       const fileInput = page.locator('#oasis-editor-image-input');
  38  |       await fileInput.setInputFiles(imagePath);
  39  | 
  40  |       const image = page.locator('.oasis-image-wrapper img');
  41  |       await expect(image).toBeVisible();
  42  | 
  43  |       const altInput = page.locator('input[placeholder="Alt text..."]');
  44  |       await expect(altInput).toBeVisible();
  45  |       
  46  |       await altInput.fill('Updated Alt Text');
  47  |       await altInput.press('Enter');
  48  | 
  49  |       await expect(image).toHaveAttribute('alt', 'Updated Alt Text');
  50  |       await page.locator('.oasis-fragment--paragraph').first().click({ force: true });
  51  |       await expect(altInput).not.toBeVisible();
  52  |       
  53  |       await image.click({ force: true });
  54  |       await expect(altInput).toBeVisible();
  55  |       expect(await altInput.inputValue()).toBe('Updated Alt Text');
  56  |     } finally {
  57  |       if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  58  |     }
  59  |   });
  60  | 
  61  |   test('should align image correctly', async ({ page }) => {
  62  |     const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  63  |     const imagePath = path.join(process.cwd(), 'test-image-align.png');
  64  |     fs.writeFileSync(imagePath, imageBuffer);
  65  | 
  66  |     try {
  67  |       const fileInput = page.locator('#oasis-editor-image-input');
  68  |       await fileInput.setInputFiles(imagePath);
  69  | 
  70  |       const imageWrapper = page.locator('.oasis-image-wrapper');
  71  |       await expect(imageWrapper).toBeVisible();
  72  | 
  73  |       const pageBox = await page.locator('.oasis-page').first().boundingBox();
  74  |       if (!pageBox) throw new Error("Could not get page box");
  75  | 
  76  |       const MARGIN_LEFT = 96;
  77  |       const MARGIN_RIGHT = 96;
  78  |       const contentWidth = pageBox.width - MARGIN_LEFT - MARGIN_RIGHT;
  79  | 
  80  |       await page.click('#oasis-editor-align-center');
  81  |       await page.waitForTimeout(300);
  82  |       let box = await imageWrapper.boundingBox();
  83  |       if (!box) throw new Error("Could not get image box");
  84  |       expect(box.x).toBeCloseTo(pageBox.x + MARGIN_LEFT + (contentWidth - box.width) / 2, 1);
  85  | 
  86  |       await page.click('#oasis-editor-align-right');
  87  |       await page.waitForTimeout(300);
  88  |       box = await imageWrapper.boundingBox();
  89  |       if (!box) throw new Error("Could not get image box");
  90  |       expect(box.x).toBeCloseTo(pageBox.x + MARGIN_LEFT + (contentWidth - box.width), 1);
  91  |     } finally {
  92  |       if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  93  |     }
  94  |   });
  95  | 
  96  |   test('should insert image via drag and drop file', async ({ page }) => {
  97  |     const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  98  |     
  99  |     await page.evaluate((buffer) => {
  100 |       const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' });
  101 |       const file = new File([blob], 'dragged-image.png', { type: 'image/png' });
  102 |       const dataTransfer = new DataTransfer();
  103 |       dataTransfer.items.add(file);
  104 |       
  105 |       const target = document.querySelector('#oasis-editor-app');
  106 |       const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
  107 |       target?.dispatchEvent(dropEvent);
  108 |     }, Array.from(imageBuffer));
  109 | 
  110 |     const image = page.locator('.oasis-image-wrapper img');
  111 |     await expect(image).toBeVisible({ timeout: 10000 });
  112 |     expect(await image.getAttribute('src')).toContain('data:image/png;base64');
  113 |   });
  114 | 
  115 |   test('should move existing image via drag and drop', async ({ page }) => {
  116 |     // 1. Insert an image first
  117 |     const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  118 |     const imagePath = path.join(process.cwd(), 'test-image-move.png');
  119 |     fs.writeFileSync(imagePath, imageBuffer);
  120 | 
  121 |     try {
  122 |       const fileInput = page.locator('#oasis-editor-image-input');
  123 |       await fileInput.setInputFiles(imagePath);
  124 |       const imageWrapper = page.locator('.oasis-image-wrapper');
  125 |       await expect(imageWrapper).toBeVisible();
  126 | 
  127 |       // 2. Add some paragraphs to have a target
  128 |       const firstPara = page.locator('.oasis-fragment--paragraph').first();
> 129 |       await firstPara.click();
      |                       ^ Error: locator.click: Test timeout of 30000ms exceeded.
  130 |       await page.keyboard.type('Para 1');
  131 |       await page.keyboard.press('Enter');
  132 |       await page.keyboard.type('Para 2');
  133 |       
  134 |       // 3. Move image after 'Para 2'
  135 |       const lastPara = page.locator('.oasis-fragment--paragraph').last();
  136 |       const lastParaBox = await lastPara.boundingBox();
  137 |       if (!lastParaBox) throw new Error("No para box");
  138 | 
  139 |       // We need to simulate dragstart, then drop
  140 |       await page.evaluate(({ blockId, x, y }) => {
  141 |         const wrapper = document.querySelector(`[data-block-id="${blockId}"]`);
  142 |         const target = document.elementFromPoint(x, y);
  143 |         
  144 |         const dragStartEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true });
  145 |         wrapper?.dispatchEvent(dragStartEvent);
  146 |         
  147 |         const dataTransfer = new DataTransfer();
  148 |         // The blockId is captured by the listener we added in OasisEditorView
  149 |         
  150 |         const dropEvent = new DragEvent('drop', { 
  151 |             bubbles: true, 
  152 |             cancelable: true, 
  153 |             dataTransfer,
  154 |             clientX: x,
  155 |             clientY: y 
  156 |         });
  157 |         target?.dispatchEvent(dropEvent);
  158 |       }, { 
  159 |           blockId: await imageWrapper.getAttribute('data-block-id'),
  160 |           x: lastParaBox.x + 5,
  161 |           y: lastParaBox.y + 5
  162 |       });
  163 | 
  164 |       // 4. Verify image is now after the last paragraph
  165 |       // In our implementation, moveBlock moves it to the target position
  166 |       // Check if image is at the end
  167 |       const lastElement = page.locator('.oasis-fragment').last();
  168 |       // The image wrapper has specific classes
  169 |       const isImage = await lastElement.evaluate(el => el.classList.contains('oasis-image-wrapper'));
  170 |       expect(isImage).toBe(true);
  171 | 
  172 |     } finally {
  173 |       if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
  174 |     }
  175 |   });
  176 | });
  177 | 
```