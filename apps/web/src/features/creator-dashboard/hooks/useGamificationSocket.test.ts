import type * as DesignSystemModule from "@outfiqe/design-system";
import { toast } from "@outfiqe/design-system";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AchievementUnlockedPayload } from "../socketEvents";
import { formatAchievementToast, useGamificationSocket } from "./useGamificationSocket";

vi.mock("@outfiqe/design-system", async (importOriginal) => {
  const actual = await importOriginal<typeof DesignSystemModule>();
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

type SocketHandler = (payload: unknown) => void;
const handlers = new Map<string, SocketHandler>();

const fakeSocket = {
  on: vi.fn((event: string, handler: SocketHandler) => {
    handlers.set(event, handler);
  }),
  off: vi.fn(),
};

vi.mock("@/shared/lib/socketClient", () => ({
  acquireSocketConnection: () => fakeSocket,
  releaseSocketConnection: vi.fn(),
}));

vi.mock("@/features/auth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

const basePayload: AchievementUnlockedPayload = {
  badgeId: "badge-1",
  badgeName: "Trailblazer",
  badgeIcon: "🏆",
  xpReward: 50,
  sponsorBrandName: null,
};

describe("formatAchievementToast", () => {
  it("formats an unlock with xp and no sponsor credit", () => {
    expect(formatAchievementToast(basePayload)).toBe(
      "🏆 Achievement unlocked: Trailblazer! +50 XP",
    );
  });

  it("omits the xp clause when the reward is zero", () => {
    expect(formatAchievementToast({ ...basePayload, xpReward: 0 })).toBe(
      "🏆 Achievement unlocked: Trailblazer!",
    );
  });

  it("appends a sponsor credit when the badge is brand-sponsored", () => {
    expect(formatAchievementToast({ ...basePayload, sponsorBrandName: "Nike" })).toBe(
      "🏆 Achievement unlocked: Trailblazer! +50 XP (sponsored by Nike)",
    );
  });
});

describe("useGamificationSocket", () => {
  it("only toasts once when the same achievement-unlocked event is redelivered", () => {
    vi.mocked(toast.success).mockClear();
    handlers.clear();
    renderHook(() => useGamificationSocket());

    const handler = handlers.get("achievement:unlocked");
    handler?.(basePayload);
    handler?.(basePayload);

    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("still toasts for a genuinely different achievement", () => {
    vi.mocked(toast.success).mockClear();
    handlers.clear();
    renderHook(() => useGamificationSocket());

    const handler = handlers.get("achievement:unlocked");
    handler?.(basePayload);
    handler?.({ ...basePayload, badgeId: "badge-2" });

    expect(toast.success).toHaveBeenCalledTimes(2);
  });

  it("only toasts once when the same level-up event is redelivered", () => {
    vi.mocked(toast.success).mockClear();
    handlers.clear();
    renderHook(() => useGamificationSocket());

    const levelUpPayload = {
      previousLevel: { level: 4, name: "Rising Star" },
      currentLevel: { level: 5, name: "Trendsetter", icon: "⭐" },
    };
    const handler = handlers.get("level:up");
    handler?.(levelUpPayload);
    handler?.(levelUpPayload);

    expect(toast.success).toHaveBeenCalledTimes(1);
  });
});
