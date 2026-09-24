import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

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

class IntersectionObserverStub implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly scrollMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = IntersectionObserverStub;
}

class ProgressEventStub<T extends EventTarget = EventTarget>
  extends Event
  implements ProgressEvent<T>
{
  readonly lengthComputable: boolean;
  readonly loaded: number;
  readonly total: number;
  declare readonly target: T | null;

  constructor(type: string, eventInitDict: ProgressEventInit = {}) {
    super(type, eventInitDict);
    this.lengthComputable = eventInitDict.lengthComputable ?? false;
    this.loaded = eventInitDict.loaded ?? 0;
    this.total = eventInitDict.total ?? 0;
  }
}

if (!globalThis.ProgressEvent) {
  globalThis.ProgressEvent = ProgressEventStub;
}
