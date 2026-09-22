import { act, render, renderHook, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TourLaunchProvider, useTourLaunch } from "./TourLaunchContext";

describe("useTourLaunch outside a provider", () => {
  it("returns a safe no-op default", () => {
    const { result } = renderHook(() => useTourLaunch());

    expect(result.current.pendingTourHref).toBeNull();
    expect(() => result.current.startTourLoading("/overview?tour=brand-dashboard")).not.toThrow();
    expect(() => result.current.finishTourLoading()).not.toThrow();
  });
});

describe("TourLaunchProvider", () => {
  it("tracks the href passed to startTourLoading", () => {
    const { result } = renderHook(() => useTourLaunch(), { wrapper: TourLaunchProvider });

    expect(result.current.pendingTourHref).toBeNull();

    act(() => result.current.startTourLoading("/overview?tour=brand-dashboard"));

    expect(result.current.pendingTourHref).toBe("/overview?tour=brand-dashboard");
  });

  it("clears the pending href once finishTourLoading is called", () => {
    const { result } = renderHook(() => useTourLaunch(), { wrapper: TourLaunchProvider });

    act(() => result.current.startTourLoading("/overview?tour=brand-dashboard"));
    expect(result.current.pendingTourHref).not.toBeNull();

    act(() => result.current.finishTourLoading());

    expect(result.current.pendingTourHref).toBeNull();
  });

  it("auto-clears a stuck pending href after the safety timeout", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useTourLaunch(), { wrapper: TourLaunchProvider });

    act(() => result.current.startTourLoading("/overview?tour=brand-dashboard"));
    expect(result.current.pendingTourHref).not.toBeNull();

    act(() => vi.advanceTimersByTime(6000));

    expect(result.current.pendingTourHref).toBeNull();
    vi.useRealTimers();
  });

  it("shares pending state between every consumer under the same provider", async () => {
    const Trigger = () => {
      const { startTourLoading } = useTourLaunch();
      return (
        <button type="button" onClick={() => startTourLoading("/overview?tour=brand-dashboard")}>
          Trigger
        </button>
      );
    };
    const Display = () => {
      const { pendingTourHref } = useTourLaunch();
      return <p>{pendingTourHref ?? "idle"}</p>;
    };

    render(
      <TourLaunchProvider>
        <Trigger />
        <Display />
      </TourLaunchProvider>,
    );

    expect(screen.getByText("idle")).toBeInTheDocument();

    screen.getByRole("button", { name: "Trigger" }).click();

    await waitFor(() =>
      expect(screen.getByText("/overview?tour=brand-dashboard")).toBeInTheDocument(),
    );
  });
});
