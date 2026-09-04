import { renderHook } from "@testing-library/react";
import type { PanInfo } from "framer-motion";
import { describe, expect, it, vi } from "vitest";

import { shouldDismissOnSwipe, useSwipeToDismiss } from "./use-swipe-to-dismiss";

const buildPanInfo = (offsetY: number, velocityY: number): PanInfo =>
  ({
    offset: { x: 0, y: offsetY },
    velocity: { x: 0, y: velocityY },
    point: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  }) as PanInfo;

describe("shouldDismissOnSwipe", () => {
  it("dismisses on a long drag", () => {
    expect(shouldDismissOnSwipe(120, 0)).toBe(true);
  });

  it("dismisses on a fast fling", () => {
    expect(shouldDismissOnSwipe(10, 900)).toBe(true);
  });

  it("keeps the panel open for a small, slow drag", () => {
    expect(shouldDismissOnSwipe(20, 100)).toBe(false);
  });
});

describe("useSwipeToDismiss", () => {
  it("returns a vertical drag config with an elastic bottom edge", () => {
    const { result } = renderHook(() => useSwipeToDismiss(vi.fn()));

    expect(result.current.drag).toBe("y");
    expect(result.current.dragConstraints).toEqual({ top: 0, bottom: 0 });
    expect(result.current.dragElastic).toEqual({ top: 0, bottom: 0.6 });
  });

  it("calls onDismiss when the drag clears the dismiss threshold", () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useSwipeToDismiss(onDismiss));

    result.current.onDragEnd({} as MouseEvent, buildPanInfo(120, 0));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("does not call onDismiss for a small, slow drag", () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useSwipeToDismiss(onDismiss));

    result.current.onDragEnd({} as MouseEvent, buildPanInfo(20, 100));

    expect(onDismiss).not.toHaveBeenCalled();
  });
});
