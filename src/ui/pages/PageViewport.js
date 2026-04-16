export class PageViewport {
  constructor(root, pageLayer) {
    this.root = root;
    this.pageLayer = pageLayer;
  }

  render(layout) {
    this.pageLayer.render(layout);
  }
}
