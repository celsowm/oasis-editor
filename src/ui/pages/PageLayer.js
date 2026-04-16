export class PageLayer {
  constructor(container) {
    this.container = container;
  }

  render(layout) {
    this.container.innerHTML = '';

    for (const page of layout.pages) {
      const pageEl = document.createElement('section');
      pageEl.className = 'oasis-page';
      pageEl.dataset.pageId = page.id;
      pageEl.style.width = `${page.rect.width}px`;
      pageEl.style.minHeight = `${page.rect.height}px`;

      if (page.headerRect) {
        const header = document.createElement('div');
        header.className = 'oasis-page-header';
        header.textContent = `Header • ${page.pageNumber}`;
        pageEl.appendChild(header);
      }

      const content = document.createElement('div');
      content.className = 'oasis-page-content';
      content.style.padding = `${page.contentRect.y}px ${page.rect.width - page.contentRect.width - page.contentRect.x}px ${page.rect.height - page.contentRect.height - page.contentRect.y}px ${page.contentRect.x}px`;

      for (const fragment of page.fragments) {
        const fragmentEl = document.createElement('article');
        fragmentEl.className = `oasis-fragment oasis-fragment--${fragment.kind}`;
        fragmentEl.dataset.fragmentId = fragment.id;
        fragmentEl.textContent = fragment.text;
        fragmentEl.style.fontFamily = fragment.typography.fontFamily;
        fragmentEl.style.fontSize = `${fragment.typography.fontSize}px`;
        fragmentEl.style.fontWeight = String(fragment.typography.fontWeight);
        content.appendChild(fragmentEl);
      }

      pageEl.appendChild(content);

      if (page.footerRect) {
        const footer = document.createElement('div');
        footer.className = 'oasis-page-footer';
        footer.textContent = `Page ${page.pageNumber}`;
        pageEl.appendChild(footer);
      }

      this.container.appendChild(pageEl);
    }
  }
}
