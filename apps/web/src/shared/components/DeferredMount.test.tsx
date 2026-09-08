import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DeferredMount } from "./DeferredMount";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("DeferredMount", () => {
  it("renders nothing until the browser is idle, then reveals its children", () => {
    let runIdleCallback = () => {};
    vi.stubGlobal("requestIdleCallback", (callback: () => void) => {
      runIdleCallback = callback;
      return 1;
    });
    vi.stubGlobal("cancelIdleCallback", vi.fn());

    render(
      <DeferredMount>
        <p>deferred content</p>
      </DeferredMount>,
    );

    expect(screen.queryByText("deferred content")).not.toBeInTheDocument();

    act(() => runIdleCallback());

    expect(screen.getByText("deferred content")).toBeInTheDocument();
  });

  it("falls back to a timeout when requestIdleCallback is unavailable", () => {
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.useFakeTimers();

    render(
      <DeferredMount>
        <p>deferred content</p>
      </DeferredMount>,
    );

    expect(screen.queryByText("deferred content")).not.toBeInTheDocument();

    act(() => {
      vi.runAllTimers();
    });

    expect(screen.getByText("deferred content")).toBeInTheDocument();
  });
});
