import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prefetch = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ prefetch }) }));

import { useIdlePrefetchSidebarLinks } from "./useIdlePrefetchSidebarLinks";

describe("useIdlePrefetchSidebarLinks", () => {
  beforeEach(() => {
    prefetch.mockClear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("prefetches every relative, same-app href once idle", () => {
    renderHook(() => useIdlePrefetchSidebarLinks(["/overview", "/wallet", "/products"]));

    vi.runAllTimers();

    expect(prefetch).toHaveBeenCalledWith("/overview");
    expect(prefetch).toHaveBeenCalledWith("/wallet");
    expect(prefetch).toHaveBeenCalledWith("/products");
    expect(prefetch).toHaveBeenCalledTimes(3);
  });

  it("skips cross-app and absolute hrefs, since router.prefetch can't warm those", () => {
    renderHook(() =>
      useIdlePrefetchSidebarLinks(["/overview", "/admin/crm", "https://outfiqe.test/help"]),
    );

    vi.runAllTimers();

    expect(prefetch).toHaveBeenCalledWith("/overview");
    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it("staggers the prefetch calls instead of firing them all at once", () => {
    renderHook(() => useIdlePrefetchSidebarLinks(["/overview", "/wallet", "/products"]));

    vi.advanceTimersByTime(200);
    expect(prefetch).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(150);
    expect(prefetch).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(150);
    expect(prefetch).toHaveBeenCalledTimes(3);
  });

  it("does nothing when given no links", () => {
    renderHook(() => useIdlePrefetchSidebarLinks([]));

    vi.runAllTimers();

    expect(prefetch).not.toHaveBeenCalled();
  });
});
