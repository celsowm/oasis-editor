import { expect, test } from "@playwright/test";
import JSZip from "jszip";

async function buildDocx(documentXml: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
        <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
        <Default Extension="xml" ContentType="application/xml"/>
        <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
      </Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
        <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
      </Relationships>`,
  );
  zip.file("word/document.xml", documentXml);
  return Buffer.from(await zip.generateAsync({ type: "arraybuffer" }));
}

test.describe("Menubar", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/oasis-editor/");
    await page.waitForSelector("#oasis-editor-loading", { state: "detached" });
  });

  test("shows only implemented top-level menus and hides placeholders", async ({ page }) => {
    const menubar = page.locator(".oasis-menubar");
    await expect(menubar).toBeVisible();

    for (const menuLabel of ["Arquivo", "Editar", "Inserir", "Formatar"]) {
      await expect(
        menubar.getByRole("menuitem", { name: menuLabel, exact: true }),
      ).toBeVisible();
    }

    for (const hiddenMenuLabel of ["Ver", "Ferramentas", "Ajuda"]) {
      await expect(
        menubar.getByRole("menuitem", { name: hiddenMenuLabel, exact: true }),
      ).toHaveCount(0);
    }

    await menubar.getByRole("menuitem", { name: "Arquivo", exact: true }).click();
    const dropdown = menubar.locator(".oasis-menubar-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown.getByRole("menuitem", { name: "Exportar", exact: true })).toBeVisible();
    await expect(dropdown.getByRole("menuitem", { name: "PDF", exact: true })).toHaveCount(0);
    await expect(dropdown.getByRole("menuitem", { name: "Salvar", exact: true })).toHaveCount(0);

    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await menubar.getByRole("menuitem", { name: "Formatar", exact: true }).click();
    await expect(menubar.locator(".oasis-menubar-dropdown")).toBeVisible();
    await expect(
      menubar.locator(".oasis-menubar-dropdown").getByRole("menuitem", { name: "Texto", exact: true }),
    ).toBeVisible();
    await expect(
      menubar.locator(".oasis-menubar-dropdown").getByRole("menuitem", { name: "Listas", exact: true }),
    ).toBeVisible();
  });

  test("exports DOCX through Arquivo > Exportar > DOCX", async ({ page }) => {
    const menubar = page.locator(".oasis-menubar");
    await menubar.getByRole("menuitem", { name: "Arquivo", exact: true }).click();
    const exportItem = menubar.locator(".oasis-menubar-dropdown").getByRole("menuitem", {
      name: "Exportar",
      exact: true,
    });
    await exportItem.hover();

    const downloadPromise = page.waitForEvent("download");
    await menubar.getByRole("menuitem", { name: "DOCX", exact: true }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe("oasis-editor.docx");
  });

  test("imports DOCX through Arquivo > Importar", async ({ page }) => {
    const file = await buildDocx(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:r><w:t>Importado pelo menu</w:t></w:r></w:p>
        </w:body>
      </w:document>`);

    const menubar = page.locator(".oasis-menubar");
    await menubar.getByRole("menuitem", { name: "Arquivo", exact: true }).click();

    const fileChooserPromise = page.waitForEvent("filechooser");
    await menubar.getByRole("menuitem", { name: /Importar/ }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: "menu-import.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      buffer: file,
    });

    await expect(page.locator('[data-testid="editor-block"]').first()).toContainText("Importado pelo menu");
  });

  test("opens find dialog and inserts a table through the menu", async ({ page }) => {
    const menubar = page.locator(".oasis-menubar");

    await menubar.getByRole("menuitem", { name: "Editar", exact: true }).click();
    await menubar.getByRole("menuitem", { name: /Localizar e Substituir/ }).click();
    await expect(page.getByText("Localizar e Substituir", { exact: true })).toBeVisible();

    await menubar.getByRole("menuitem", { name: "Inserir", exact: true }).click();
    await menubar.getByRole("menuitem", { name: "Tabela", exact: true }).click();
    await expect(page.locator('[data-testid="editor-table-cell"]').first()).toBeVisible();
  });
});
