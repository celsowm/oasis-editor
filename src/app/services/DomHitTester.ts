/**
 * Abstraction over browser DOM hit-testing APIs.
 * Allows unit tests to mock element resolution without touching the real DOM.
 */
export interface DomHitTester {
  elementFromPoint(x: number, y: number): Element | null;
  closest(selector: string, element: Element): Element | null;
}

export class BrowserDomHitTester implements DomHitTester {
  elementFromPoint(x: number, y: number): Element | null {
    return document.elementFromPoint(x, y);
  }

  closest(selector: string, element: Element): Element | null {
    return element.closest(selector);
  }
}
