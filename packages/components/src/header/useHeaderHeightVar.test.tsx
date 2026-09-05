import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { stubElementHeight, triggerResizeObservers, waitForAnimationFrame } from "../testing/setup";
import { useHeaderHeightVar } from "./useHeaderHeightVar";

const HeightVarHarness = ({ attachRef }: { attachRef: boolean }) => {
  const headerRef = useRef<HTMLDivElement>(null);
  useHeaderHeightVar(headerRef);
  return attachRef ? <div ref={headerRef}>Header</div> : <div>Header</div>;
};

describe("useHeaderHeightVar", () => {
  it("does nothing when the ref was never attached to an element", async () => {
    stubElementHeight(80);
    render(<HeightVarHarness attachRef={false} />);

    triggerResizeObservers();
    await waitForAnimationFrame();

    expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe("");
  });

  it("coalesces bursts of resize notifications into a single write", async () => {
    stubElementHeight(80);
    const setProperty = vi.spyOn(document.documentElement.style, "setProperty");

    render(<HeightVarHarness attachRef />);
    triggerResizeObservers();
    triggerResizeObservers();
    triggerResizeObservers();
    await waitForAnimationFrame();

    expect(setProperty).toHaveBeenCalledTimes(1);
    expect(setProperty).toHaveBeenCalledWith("--site-header-height", "80px");
  });

  it("cancels a pending frame when unmounted before it runs", async () => {
    stubElementHeight(80);
    const { unmount } = render(<HeightVarHarness attachRef />);

    triggerResizeObservers();
    unmount();
    await waitForAnimationFrame();

    expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe("");
  });
});
