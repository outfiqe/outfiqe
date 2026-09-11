import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { usePendingSelection } from "./usePendingSelection";

describe("usePendingSelection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("has no pending value until a selection is marked", () => {
    const { result } = renderHook(() => usePendingSelection<string>("for_you"));
    expect(result.current.pendingValue).toBeNull();
  });

  it("reports the marked value while the current key has not caught up yet", () => {
    const { result } = renderHook(({ key }) => usePendingSelection<string>(key), {
      initialProps: { key: "for_you" },
    });

    act(() => result.current.markPending("following"));

    expect(result.current.pendingValue).toBe("following");
  });

  it("clears the pending value once the current key commits to the marked selection", () => {
    const { result, rerender } = renderHook(({ key }) => usePendingSelection<string>(key), {
      initialProps: { key: "for_you" },
    });

    act(() => result.current.markPending("following"));
    rerender({ key: "following" });

    expect(result.current.pendingValue).toBeNull();
  });

  it("keeps the latest marked value when a second selection is made before the first commits", () => {
    const { result } = renderHook(({ key }) => usePendingSelection<string>(key), {
      initialProps: { key: "for_you" },
    });

    act(() => result.current.markPending("following"));
    act(() => result.current.markPending("trending"));

    expect(result.current.pendingValue).toBe("trending");
  });

  it("drops a stuck pending selection after the safety timeout", () => {
    const { result } = renderHook(() => usePendingSelection<string>("for_you"));

    act(() => result.current.markPending("following"));
    act(() => vi.advanceTimersByTime(3000));

    expect(result.current.pendingValue).toBeNull();
  });
});
