/** Report fixture setup failures directly instead of an opaque polling timeout. */
export async function waitForRibbonReference(page) {
  await page.waitForFunction(
    () =>
      window.ribbonReference || document.documentElement.dataset.referenceError,
  );
  const error = await page.evaluate(
    () => document.documentElement.dataset.referenceError,
  );
  if (error) throw new Error(`Ribbon reference setup failed: ${error}`);
}
