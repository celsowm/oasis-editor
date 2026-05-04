import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Oasis Editor Image Insertion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/oasis-editor/');
    await page.waitForSelector('#oasis-editor-loading', { state: 'detached' });
  });

  test('should insert an image via toolbar button', async ({ page }) => {
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const imagePath = path.join(process.cwd(), 'test-image-toolbar.png');
    fs.writeFileSync(imagePath, imageBuffer);

    try {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.locator('#oasis-editor-insert-image').click({ force: true });
      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles(imagePath);

      const image = page.locator('.oasis-image-wrapper img');
      await expect(image).toBeVisible({ timeout: 10000 });
      const src = await image.getAttribute('src');
      expect(src).toContain('data:image/png;base64');
    } finally {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  });

  test('should update alt text correctly', async ({ page }) => {
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const imagePath = path.join(process.cwd(), 'test-image-alt.png');
    fs.writeFileSync(imagePath, imageBuffer);

    try {
      const fileInput = page.locator('#oasis-editor-image-input');
      await fileInput.setInputFiles(imagePath);

      const image = page.locator('.oasis-image-wrapper img');
      await expect(image).toBeVisible();

      const altInput = page.locator('input[placeholder="Alt text..."]');
      await expect(altInput).toBeVisible();

      await altInput.fill('Updated Alt Text');
      await altInput.press('Enter');

      await expect(image).toHaveAttribute('alt', 'Updated Alt Text');
      await page.locator('.oasis-fragment--paragraph').first().click({ force: true });
      await expect(altInput).not.toBeVisible();

      await image.click({ force: true });
      await expect(altInput).toBeVisible();
      expect(await altInput.inputValue()).toBe('Updated Alt Text');
    } finally {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  });

  test('should align image correctly', async ({ page }) => {
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const imagePath = path.join(process.cwd(), 'test-image-align.png');
    fs.writeFileSync(imagePath, imageBuffer);

    try {
      const fileInput = page.locator('#oasis-editor-image-input');
      await fileInput.setInputFiles(imagePath);

      const imageWrapper = page.locator('.oasis-image-wrapper');
      await expect(imageWrapper).toBeVisible();

      const pageBox = await page.locator('.oasis-page').first().boundingBox();
      if (!pageBox) throw new Error("Could not get page box");

      const MARGIN_LEFT = 96;
      const MARGIN_RIGHT = 96;
      const contentWidth = pageBox.width - MARGIN_LEFT - MARGIN_RIGHT;

      await page.click('#oasis-editor-align-center');
      await page.waitForTimeout(300);
      let box = await imageWrapper.boundingBox();
      if (!box) throw new Error("Could not get image box");
      expect(box.x).toBeCloseTo(pageBox.x + MARGIN_LEFT + (contentWidth - box.width) / 2, 1);

      await page.click('#oasis-editor-align-right');
      await page.waitForTimeout(300);
      box = await imageWrapper.boundingBox();
      if (!box) throw new Error("Could not get image box");
      expect(box.x).toBeCloseTo(pageBox.x + MARGIN_LEFT + (contentWidth - box.width), 1);
    } finally {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  });

  test('should insert image via drag and drop file', async ({ page }) => {
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    
    await page.evaluate((buffer) => {
      const blob = new Blob([new Uint8Array(buffer)], { type: 'image/png' });
      const file = new File([blob], 'dragged-image.png', { type: 'image/png' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      
      const target = document.querySelector('#oasis-editor-app');
      const dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer });
      target?.dispatchEvent(dropEvent);
    }, Array.from(imageBuffer));

    const image = page.locator('.oasis-image-wrapper img');
    await expect(image).toBeVisible({ timeout: 10000 });
    expect(await image.getAttribute('src')).toContain('data:image/png;base64');
  });

  test('should move existing image via drag and drop', async ({ page }) => {
    // 1. Insert an image first
    const imageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const imagePath = path.join(process.cwd(), 'test-image-move.png');
    fs.writeFileSync(imagePath, imageBuffer);

    try {
      const fileInput = page.locator('#oasis-editor-image-input');
      await fileInput.setInputFiles(imagePath);
      const imageWrapper = page.locator('.oasis-image-wrapper');
      await expect(imageWrapper).toBeVisible();

      // 2. Add some paragraphs to have a target
      const firstPara = page.locator('.oasis-fragment--paragraph').first();
      await firstPara.click();
      await page.keyboard.type('Para 1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Para 2');
      
      // 3. Move image after 'Para 2'
      const lastPara = page.locator('.oasis-fragment--paragraph').last();
      const lastParaBox = await lastPara.boundingBox();
      if (!lastParaBox) throw new Error("No para box");

      // We need to simulate dragstart, then drop
      await page.evaluate(({ blockId, x, y }) => {
        const wrapper = document.querySelector(`[data-block-id="${blockId}"]`);
        const target = document.elementFromPoint(x, y);
        
        const dragStartEvent = new DragEvent('dragstart', { bubbles: true, cancelable: true });
        wrapper?.dispatchEvent(dragStartEvent);
        
        const dataTransfer = new DataTransfer();
        // The blockId is captured by the listener we added in OasisEditorView
        
        const dropEvent = new DragEvent('drop', { 
            bubbles: true, 
            cancelable: true, 
            dataTransfer,
            clientX: x,
            clientY: y 
        });
        target?.dispatchEvent(dropEvent);
      }, { 
          blockId: await imageWrapper.getAttribute('data-block-id'),
          x: lastParaBox.x + 5,
          y: lastParaBox.y + 5
      });

      // 4. Verify image is now after the last paragraph
      // In our implementation, moveBlock moves it to the target position
      // Check if image is at the end
      const lastElement = page.locator('.oasis-fragment').last();
      // The image wrapper has specific classes
      const isImage = await lastElement.evaluate(el => el.classList.contains('oasis-image-wrapper'));
      expect(isImage).toBe(true);

    } finally {
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }
  });
});
