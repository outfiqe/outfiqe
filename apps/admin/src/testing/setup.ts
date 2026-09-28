import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { grantEveryPlatformPermission } from "./platformPermissionsMock";

vi.mock("@/features/auth/usePlatformPermissions", async () => {
  const { mockedUsePlatformPermissions } = await import("./platformPermissionsMock");
  return { usePlatformPermissions: mockedUsePlatformPermissions };
});

afterEach(cleanup);
afterEach(grantEveryPlatformPermission);

class ResizeObserverStub {
  constructor(_callback: ResizeObserverCallback) {}
  observe(_target: Element): void {}
  unobserve(_target: Element): void {}
  disconnect(): void {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverStub;
}
