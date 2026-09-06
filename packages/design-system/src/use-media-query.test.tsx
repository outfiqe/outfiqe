import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./use-media-query";

const MOBILE_QUERY = "(max-width: 639.98px)";

type MatchMediaStub = {
  matchMedia: ReturnType<typeof vi.fn>;
  emitChange: (nextMatches: boolean) => void;
};

const createMatchMediaStub = (initialMatches: boolean): MatchMediaStub => {
  const changeListeners = new Set<() => void>();
  let currentMatches = initialMatches;

  const matchMedia = vi.fn((query: string): MediaQueryList => ({
    get matches() {
      return currentMatches;
    },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => changeListeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => changeListeners.delete(listener),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));

  const emitChange = (nextMatches: boolean): void => {
    currentMatches = nextMatches;
    changeListeners.forEach((listener) => listener());
  };

  return { matchMedia, emitChange };
};

const MediaQueryProbe = ({ renderCount }: { renderCount: number }) => {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  return (
    <span data-testid="probe">
      {String(isMobile)}:{renderCount}
    </span>
  );
};

describe("useMediaQuery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reflects the current match and reacts to change events", () => {
    const { matchMedia, emitChange } = createMatchMediaStub(false);
    vi.stubGlobal("matchMedia", matchMedia);

    render(<MediaQueryProbe renderCount={0} />);
    expect(screen.getByTestId("probe")).toHaveTextContent("false:0");

    act(() => emitChange(true));
    expect(screen.getByTestId("probe")).toHaveTextContent("true:0");
  });

  it("creates the MediaQueryList once and reuses it across re-renders", () => {
    const { matchMedia } = createMatchMediaStub(true);
    vi.stubGlobal("matchMedia", matchMedia);

    const { rerender } = render(<MediaQueryProbe renderCount={0} />);
    rerender(<MediaQueryProbe renderCount={1} />);
    rerender(<MediaQueryProbe renderCount={2} />);
    rerender(<MediaQueryProbe renderCount={3} />);

    expect(screen.getByTestId("probe")).toHaveTextContent("true:3");
    expect(matchMedia).toHaveBeenCalledTimes(1);
  });

  it("falls back to no match when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);

    render(<MediaQueryProbe renderCount={0} />);

    expect(screen.getByTestId("probe")).toHaveTextContent("false:0");
  });
});
