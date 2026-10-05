import { act, renderHook } from "@testing-library/react";
import { useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useTabSearchParam } from "./useTabSearchParam";

vi.mock("next/navigation", () => ({ useSearchParams: vi.fn() }));

const BOARD_TABS = ["outfit", "people", "photos"] as const;

const visitUrl = (url: string) => window.history.replaceState(null, "", url);

beforeEach(() => {
  vi.mocked(useSearchParams).mockImplementation(
    () => new URLSearchParams(window.location.search) as ReturnType<typeof useSearchParams>,
  );
  visitUrl("/builds/outfit-1");
});

describe("useTabSearchParam", () => {
  it("opens the default tab when the URL names none or an unknown one", () => {
    const { result, rerender } = renderHook(() => useTabSearchParam(BOARD_TABS, "outfit"));
    expect(result.current.selectedTab).toBe("outfit");

    visitUrl("/builds/outfit-1?tab=settings");
    rerender();

    expect(result.current.selectedTab).toBe("outfit");
  });

  it("opens the tab the URL names", () => {
    visitUrl("/builds/outfit-1?tab=people");
    const { result } = renderHook(() => useTabSearchParam(BOARD_TABS, "outfit"));

    expect(result.current.selectedTab).toBe("people");
  });

  it("writes the chosen tab into the URL and keeps the other params and the hash", () => {
    visitUrl("/creator/sita?look=look-1#drops");
    const { result, rerender } = renderHook(() => useTabSearchParam(BOARD_TABS, "outfit"));

    act(() => result.current.selectTab("photos"));
    rerender();

    expect(window.location.pathname).toBe("/creator/sita");
    expect(window.location.search).toBe("?look=look-1&tab=photos");
    expect(window.location.hash).toBe("#drops");
    expect(result.current.selectedTab).toBe("photos");
  });

  it("ignores a tab it doesn't know and can use its own param name", () => {
    visitUrl("/tag-reviews?status=pending");
    const { result } = renderHook(() => useTabSearchParam(BOARD_TABS, "outfit", "section"));

    act(() => result.current.selectTab("settings"));
    expect(window.location.search).toBe("?status=pending");

    act(() => result.current.selectTab("people"));
    expect(window.location.search).toBe("?status=pending&section=people");
  });
});
