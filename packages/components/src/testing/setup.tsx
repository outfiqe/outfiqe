import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

const registeredResizeCallbacks: ResizeObserverCallback[] = [];

class ResizeObserverStub {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    registeredResizeCallbacks.push(callback);
  }

  observe(_target: Element): void {}

  unobserve(_target: Element): void {}

  disconnect(): void {
    const index = registeredResizeCallbacks.indexOf(this.callback);
    if (index !== -1) registeredResizeCallbacks.splice(index, 1);
  }
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

export const triggerResizeObservers = (): void => {
  [...registeredResizeCallbacks].forEach((callback) =>
    callback([], new ResizeObserverStub(() => {})),
  );
};

export const waitForAnimationFrame = (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });

export const stubElementHeight = (heightPx: number): void => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
    height: heightPx,
    width: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  registeredResizeCallbacks.length = 0;
  document.documentElement.style.removeProperty("--site-header-height");
});
