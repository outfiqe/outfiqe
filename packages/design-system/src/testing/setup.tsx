import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import type * as Recharts from "recharts";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

class ResizeObserverStub {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub;
}

export const stubMatchMedia = (matches: boolean): void => {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
};

if (!window.matchMedia) {
  stubMatchMedia(false);
}

const STUB_CHART_WIDTH = 800;
const STUB_CHART_HEIGHT = 400;

vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof Recharts>();
  const ResponsiveContainer = ({ children }: { children: ReactNode }) =>
    isValidElement(children)
      ? cloneElement(children as ReactElement<{ width?: number; height?: number }>, {
          width: STUB_CHART_WIDTH,
          height: STUB_CHART_HEIGHT,
        })
      : children;
  return { ...actual, ResponsiveContainer };
});
