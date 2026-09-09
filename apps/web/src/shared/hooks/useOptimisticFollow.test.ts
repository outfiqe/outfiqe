import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOptimisticFollow } from "./useOptimisticFollow";
import { useToggleFollow } from "./useToggleFollow";

vi.mock("./useToggleFollow", () => ({
  useToggleFollow: vi.fn(),
}));

const mutate = vi.fn();

type MutateOptions = { onError?: () => void; onSettled?: () => void };

const lastMutateOptions = (): MutateOptions => mutate.mock.calls.at(-1)?.[1] ?? {};

beforeEach(() => {
  mutate.mockReset();
  vi.mocked(useToggleFollow, { partial: true }).mockReturnValue({ mutate, isPending: false });
});

const renderOptimisticFollow = (isFollowing: boolean, followerCount: number) =>
  renderHook(({ snapshot }) => useOptimisticFollow("brand", snapshot), {
    initialProps: { snapshot: { isFollowing, followerCount } },
  });

describe("useOptimisticFollow", () => {
  it("mirrors the server snapshot before any interaction", () => {
    const { result } = renderOptimisticFollow(true, 42);

    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(42);
  });

  it("optimistically flips the follow state and count on toggle", () => {
    const { result } = renderOptimisticFollow(false, 10);

    act(() => result.current.toggleFollow("brand-1"));

    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(11);
    expect(mutate).toHaveBeenCalledWith(
      { targetId: "brand-1", following: false },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("rolls back to the server snapshot when the request fails", () => {
    const { result } = renderOptimisticFollow(false, 10);

    act(() => result.current.toggleFollow("brand-1"));
    act(() => lastMutateOptions().onError?.());

    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(10);
  });

  it("drops the optimistic value once the server snapshot catches up", () => {
    const { result, rerender } = renderOptimisticFollow(false, 10);

    act(() => result.current.toggleFollow("brand-1"));
    expect(result.current.followerCount).toBe(11);

    rerender({ snapshot: { isFollowing: true, followerCount: 11 } });

    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(11);
  });

  it("re-syncs when the server snapshot changes without a local toggle", () => {
    const { result, rerender } = renderOptimisticFollow(false, 10);

    rerender({ snapshot: { isFollowing: true, followerCount: 99 } });

    expect(result.current.isFollowing).toBe(true);
    expect(result.current.followerCount).toBe(99);
  });

  it("forwards the reconcile callback to the mutation's onSettled", () => {
    const { result } = renderOptimisticFollow(false, 10);
    const onReconcile = vi.fn();

    act(() => result.current.toggleFollow("brand-1", onReconcile));

    expect(lastMutateOptions().onSettled).toBe(onReconcile);
  });

  it("toggles back off from an already-followed server snapshot", () => {
    const { result } = renderOptimisticFollow(true, 10);

    act(() => result.current.toggleFollow("brand-1"));

    expect(result.current.isFollowing).toBe(false);
    expect(result.current.followerCount).toBe(9);
    expect(mutate).toHaveBeenCalledWith(
      { targetId: "brand-1", following: true },
      expect.anything(),
    );
  });
});
