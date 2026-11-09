/** Synthetic content only. IDs and selections are resolved after import. */
export const ribbonFixtures = {
  text: '<h1>Ribbon reference</h1><p>Normal text with <strong>bold</strong>, <em>emphasis</em>, and a <a href="https://example.com">reference link</a>.</p><h2>Heading two</h2><p>Caption sample and a second paragraph for selection.</p>',
  lists:
    "<p>List reference</p><ol><li>First level</li><li>Second item<ol><li>Nested item</li></ol></li></ol><ul><li>Bullet one</li><li>Bullet two</li></ul>",
  table:
    "<table><tr><th>Item</th><th>Quantity</th></tr><tr><td>Alpha</td><td>2</td></tr><tr><td>Beta</td><td>3</td></tr></table><p>After the table.</p>",
  image:
    '<p>Image reference</p><p><img alt="Synthetic blue square" width="48" height="48" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==" /></p>',
} as const;
export type RibbonFixture = keyof typeof ribbonFixtures;
