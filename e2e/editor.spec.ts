import { test, expect } from '@playwright/test';

test.describe('Oasis Editor Behavioral Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Monitor console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`BROWSER ERROR: ${msg.text()}`);
      }
    });

    await page.goto('/');
    // Wait for loader to disappear
    await page.waitForSelector('#oasis-editor-loading', { state: 'detached' });
    // Ensure shell is visible
    await expect(page.locator('.oasis-editor-shell')).toBeVisible();
  });

  test('should reflect underline state in toolbar', async ({ page }) => {
    const paragraph = page.locator('.oasis-fragment--paragraph').first();
    await paragraph.click({ force: true });
    
    const underlineButton = page.locator('#oasis-editor-underline');
    
    // 1. Click underline button
    await underlineButton.click({ force: true });
    
    // 2. Type some text
    await page.keyboard.type('UNDERLINED_TEXT');
    
    // 3. Verify button is active
    await expect(underlineButton).toHaveClass(/active/);
    
    // 4. Move cursor out of underlined text (by typing without underline)
    await underlineButton.click({ force: true }); // Toggle off
    await page.keyboard.type(' NORMAL_TEXT');
    
    // 5. Verify button is NOT active
    await expect(underlineButton).not.toHaveClass(/active/);
    
    // 6. Click back on underlined text
    const underlinedSpan = page.locator('.oasis-fragment span', { hasText: 'UNDERLINED_TEXT' });
    await underlinedSpan.click({ position: { x: 5, y: 5 } });
    
    // 7. Verify button is active again
    await expect(underlineButton).toHaveClass(/active/);
  });

  test('should render initial content and allow editing', async ({ page }) => {
    const pageLocator = page.locator('.oasis-page');
    await expect(pageLocator).toBeVisible();
    await expect(pageLocator).toHaveCount(1);

    const loremFragment = page.locator('.oasis-fragment--heading', { hasText: 'Lorem Ipsum' });
    await expect(loremFragment).toBeVisible();

    await loremFragment.click({ position: { x: 5, y: 5 } });
    const caret = page.locator('.oasis-caret');
    await expect(caret).toBeVisible();

    const testText = 'Hello World';
    await page.keyboard.type(testText);
    const newTextFragment = page.locator('.oasis-fragment', { hasText: testText });
    await expect(newTextFragment).toBeVisible();
    
    // Final debug screenshot
    await page.screenshot({ path: 'e2e-debug-final.png', fullPage: true });
  });

  test('should handle formatting commands', async ({ page }) => {
    const paragraph = page.locator('.oasis-fragment--paragraph').first();
    await paragraph.click({ force: true });
    await page.locator('#oasis-editor-input').focus();

    await page.keyboard.press('Control+B');
    await page.waitForTimeout(200);
    await page.keyboard.type('SHORTCUT_BOLD');

    const boldSpan = page.locator('.oasis-fragment span', { hasText: 'SHORTCUT_BOLD' });
    await expect(boldSpan).toBeVisible();
    
    const fontWeight = await boldSpan.evaluate(el => window.getComputedStyle(el).fontWeight);
    expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
  });

  test('should respond to toolbar actions', async ({ page }) => {
    const paragraph = page.locator('.oasis-fragment--paragraph').first();
    await paragraph.click({ force: true });
    
    const boldButton = page.locator('#oasis-editor-bold');
    await boldButton.click({ force: true });
    
    await page.waitForTimeout(200);
    await page.keyboard.type('TOOLBAR_BOLD');
    
    const boldSpan = page.locator('.oasis-fragment span', { hasText: 'TOOLBAR_BOLD' });
    await expect(boldSpan).toBeVisible();
    
    const fontWeight = await boldSpan.evaluate(el => window.getComputedStyle(el).fontWeight);
    expect(parseInt(fontWeight)).toBeGreaterThanOrEqual(600);
  });
});
