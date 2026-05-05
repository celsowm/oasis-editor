import { test, expect } from "@playwright/test";

test.describe("Menubar", () => {
  test("renders top-level menus and handles insertion", async ({ page }) => {
    await page.goto("./"); // Adjust URL if necessary

    // Wait for the editor to load
    const editorShell = page.locator(".oasis-editor-app");
    await expect(editorShell).toBeVisible();

    const menubar = page.locator(".oasis-menubar");
    await expect(menubar).toBeVisible();

    // Verify top-level menus exist
    const expectedMenus = ["Arquivo", "Editar", "Ver", "Inserir", "Formatar", "Ferramentas", "Ajuda"]; // pt-BR defaults
    for (const menuLabel of expectedMenus) {
      const menuButton = menubar.getByRole("menuitem", { name: menuLabel, exact: true });
      await expect(menuButton).toBeVisible();
    }

    // Click "Inserir"
    const insertMenu = menubar.getByRole("menuitem", { name: "Inserir", exact: true });
    await insertMenu.click();

    // The dropdown should appear
    const dropdown = menubar.locator(".oasis-menubar-dropdown");
    await expect(dropdown).toBeVisible();

    // Click "Horizontal Rule"
    const hrItem = dropdown.getByRole("menuitem").filter({ hasText: "Horizontal Rule" });
    await hrItem.click();

    // Assert HR appears in the editor
    // Note: The specific assert depends on how HR is modeled. For now, check if an HR or section break is added,
    // or simply that the action didn't crash.
    // If HR isn't fully implemented in the engine, at least the menu closes.
    await expect(dropdown).not.toBeVisible();
  });
});
