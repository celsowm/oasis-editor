# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: oasis-editor-2.spec.ts >> Oasis Editor 2 smoke tests >> clicks into a lower page after scroll and inserts into the clicked paragraph
- Location: e2e\oasis-editor-2.spec.ts:210:3

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: locator('[data-testid="editor-2-block"]').last()
Expected substring: "Paragraph 60X"
Received string:    "Paragraph 60"
Timeout: 5000ms

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for locator('[data-testid="editor-2-block"]').last()
    9 × locator resolved to <p data-end-offset="12" data-start-offset="0" class="oasis-editor-2-block" data-testid="editor-2-block" data-paragraph-id="paragraph:60" data-block-id="paragraph:60:segment:0" data-source-paragraph-id="paragraph:60">…</p>
      - unexpected value "Paragraph 60"

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
        - generic [ref=e88]:
          - generic [ref=e92]:
            - paragraph [ref=e93]:
              - generic [ref=e95]: Paragraph 01
            - paragraph [ref=e96]:
              - generic [ref=e98]: Paragraph 02
            - paragraph [ref=e99]:
              - generic [ref=e101]: Paragraph 03
            - paragraph [ref=e102]:
              - generic [ref=e104]: Paragraph 04
            - paragraph [ref=e105]:
              - generic [ref=e107]: Paragraph 05
            - paragraph [ref=e108]:
              - generic [ref=e110]: Paragraph 06
            - paragraph [ref=e111]:
              - generic [ref=e113]: Paragraph 07
            - paragraph [ref=e114]:
              - generic [ref=e116]: Paragraph 08
            - paragraph [ref=e117]:
              - generic [ref=e119]: Paragraph 09
            - paragraph [ref=e120]:
              - generic [ref=e122]: Paragraph 10
            - paragraph [ref=e123]:
              - generic [ref=e125]: Paragraph 11
            - paragraph [ref=e126]:
              - generic [ref=e128]: Paragraph 12
            - paragraph [ref=e129]:
              - generic [ref=e131]: Paragraph 13
            - paragraph [ref=e132]:
              - generic [ref=e134]: Paragraph 14
            - paragraph [ref=e135]:
              - generic [ref=e137]: Paragraph 15
            - paragraph [ref=e138]:
              - generic [ref=e140]: Paragraph 16
            - paragraph [ref=e141]:
              - generic [ref=e143]: Paragraph 17
            - paragraph [ref=e144]:
              - generic [ref=e146]: Paragraph 18
            - paragraph [ref=e147]:
              - generic [ref=e149]: Paragraph 19
            - paragraph [ref=e150]:
              - generic [ref=e152]: Paragraph 20
            - paragraph [ref=e153]:
              - generic [ref=e155]: Paragraph 21
            - paragraph [ref=e156]:
              - generic [ref=e158]: Paragraph 22
            - paragraph [ref=e159]:
              - generic [ref=e161]: Paragraph 23
            - paragraph [ref=e162]:
              - generic [ref=e164]: Paragraph 24
            - paragraph [ref=e165]:
              - generic [ref=e167]: Paragraph 25
            - paragraph [ref=e168]:
              - generic [ref=e170]: Paragraph 26
          - generic [ref=e176]:
            - paragraph [ref=e177]:
              - generic [ref=e179]: Paragraph 27
            - paragraph [ref=e180]:
              - generic [ref=e182]: Paragraph 28
            - paragraph [ref=e183]:
              - generic [ref=e185]: Paragraph 29
            - paragraph [ref=e186]:
              - generic [ref=e188]: Paragraph 30
            - paragraph [ref=e189]:
              - generic [ref=e191]: Paragraph 31
            - paragraph [ref=e192]:
              - generic [ref=e194]: Paragraph 32
            - paragraph [ref=e195]:
              - generic [ref=e197]: Paragraph 33
            - paragraph [ref=e198]:
              - generic [ref=e200]: Paragraph 34
            - paragraph [ref=e201]:
              - generic [ref=e203]: Paragraph 35
            - paragraph [ref=e204]:
              - generic [ref=e206]: Paragraph 36
            - paragraph [ref=e207]:
              - generic [ref=e209]: Paragraph 37
            - paragraph [ref=e210]:
              - generic [ref=e212]: Paragraph 38
            - paragraph [ref=e213]:
              - generic [ref=e215]: Paragraph 39
            - paragraph [ref=e216]:
              - generic [ref=e218]: Paragraph 40
            - paragraph [ref=e219]:
              - generic [ref=e221]: Paragraph 41
            - paragraph [ref=e222]:
              - generic [ref=e224]: Paragraph 42
            - paragraph [ref=e225]:
              - generic [ref=e227]: Paragraph 43
            - paragraph [ref=e228]:
              - generic [ref=e230]: Paragraph 44
            - paragraph [ref=e231]:
              - generic [ref=e233]: Paragraph 45
            - paragraph [ref=e234]:
              - generic [ref=e236]: Paragraph 46
            - paragraph [ref=e237]:
              - generic [ref=e239]: Paragraph 47
            - paragraph [ref=e240]:
              - generic [ref=e242]: Paragraph 48
            - paragraph [ref=e243]:
              - generic [ref=e245]: Paragraph 49
            - paragraph [ref=e246]:
              - generic [ref=e248]: Paragraph 50
            - paragraph [ref=e249]:
              - generic [ref=e251]: Paragraph 51
            - paragraph [ref=e252]:
              - generic [ref=e254]: Paragraph 52
          - generic [ref=e260]:
            - paragraph [ref=e261]:
              - generic [ref=e263]: Paragraph 53
            - paragraph [ref=e264]:
              - generic [ref=e266]: Paragraph 54
            - paragraph [ref=e267]:
              - generic [ref=e269]: Paragraph 55
            - paragraph [ref=e270]:
              - generic [ref=e272]: Paragraph 56
            - paragraph [ref=e273]:
              - generic [ref=e275]: Paragraph 57
            - paragraph [ref=e276]:
              - generic [ref=e278]: Paragraph 58
            - paragraph [ref=e279]:
              - generic [ref=e281]: Paragraph 59
            - paragraph [ref=e282]:
              - generic [ref=e284]: Paragraph 60
        - textbox "Editor input"
      - generic [ref=e288]: 720 caracteres
    - complementary [ref=e289]:
      - generic [ref=e290]:
        - heading "Paragraph Properties" [level=3] [ref=e291]
        - generic [ref=e292]:
          - button "Page Break" [ref=e293] [cursor=pointer]:
            - img [ref=e294]
            - generic [ref=e298]: Page Break
          - button "Keep Next" [ref=e299] [cursor=pointer]:
            - img [ref=e300]
            - generic [ref=e303]: Keep Next
        - generic [ref=e304]:
          - generic [ref=e305]:
            - generic "Line Height" [ref=e306]: Line
            - spinbutton [ref=e307]: "1.6"
          - generic [ref=e308]:
            - generic "Spacing Before" [ref=e309]: Before
            - spinbutton [ref=e310]: "0"
          - generic [ref=e311]:
            - generic "Spacing After" [ref=e312]: After
            - spinbutton [ref=e313]: "0"
          - generic [ref=e314]:
            - generic "Left Indent" [ref=e315]: Indent
            - spinbutton [ref=e316]: "0"
          - generic [ref=e317]:
            - generic "First Line Indent" [ref=e318]: First
            - spinbutton [ref=e319]: "0"
          - generic [ref=e320]:
            - generic "Hanging Indent" [ref=e321]: Hang
            - spinbutton [ref=e322]: "0"
        - generic [ref=e323]:
          - generic "Paragraph Background Color" [ref=e324]:
            - generic [ref=e325]: Para BG
            - textbox "Para BG" [ref=e326] [cursor=pointer]: "#ffffff"
          - button "Para Borders" [ref=e327] [cursor=pointer]:
            - img [ref=e328]
            - generic [ref=e329]: Para Borders
```

# Test source

```ts
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
  203 | 
  204 |     await input.focus();
  205 |     await page.keyboard.type("abc");
  206 | 
  207 |     await expect(page.locator('[data-testid="editor-2-block"]').last()).toContainText("abc");
  208 |   });
  209 | 
  210 |   test("clicks into a lower page after scroll and inserts into the clicked paragraph", async ({ page }) => {
  211 |     const input = page.locator('[data-testid="editor-2-input"]');
  212 |     await input.focus();
  213 | 
  214 |     const lines = Array.from({ length: 60 }, (_, index) => `Paragraph ${String(index + 1).padStart(2, "0")}`).join("\n");
  215 |     await pastePlainText(page, lines);
  216 | 
  217 |     const editor = page.locator('[data-testid="editor-2-editor"]');
  218 |     await editor.evaluate((node) => {
  219 |       node.scrollTop = node.scrollHeight;
  220 |     });
  221 | 
  222 |     const lastParagraph = page.locator('[data-testid="editor-2-block"]').last();
  223 |     await expect(lastParagraph).toBeVisible();
  224 |     const firstChar = lastParagraph.locator('[data-testid="editor-2-char"]').first();
  225 |     const box = await firstChar.boundingBox();
  226 |     if (!box) {
  227 |       throw new Error("Could not measure the first character on the lower page");
  228 |     }
  229 | 
  230 |     await page.mouse.click(box.x + box.width - 1, box.y + box.height / 2);
  231 |     await page.keyboard.type("X");
  232 | 
> 233 |     await expect(lastParagraph).toContainText("Paragraph 60X");
      |                                 ^ Error: expect(locator).toContainText(expected) failed
  234 |   });
  235 | });
  236 | 
```