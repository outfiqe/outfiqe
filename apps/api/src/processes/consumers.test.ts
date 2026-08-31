import { beforeEach, describe, expect, it, vi } from "vitest";

const fns = vi.hoisted(() => ({
  registerSocketListeners: vi.fn(),
  registerCreatorLookSocketHandlers: vi.fn(),
  registerCommentEventConsumer: vi.fn(),
  registerLeaderboardSocketHandlers: vi.fn(),
  registerLeaderboardEventConsumer: vi.fn(),
  registerCreatorLeaderboardSocketHandlers: vi.fn(),
  registerCreatorLeaderboardEventConsumer: vi.fn(),
  registerXpSocketEventConsumer: vi.fn(),
  registerAchievementSocketEventConsumer: vi.fn(),
  registerNotificationSocketEventConsumer: vi.fn(),
  registerChatSocketEventConsumer: vi.fn(),
  registerConversationSocketHandlers: vi.fn(),
  registerMessageEventConsumer: vi.fn(),
  registerPresenceSocketConsumer: vi.fn(),
  registerXpEventConsumers: vi.fn(),
  registerAchievementEventConsumers: vi.fn(),
  registerNotificationEventConsumers: vi.fn(),
}));

vi.mock("#socket/socket.listeners.js", () => ({
  registerSocketListeners: fns.registerSocketListeners,
}));
vi.mock("#modules/creator-looks/creatorLook.socket.js", () => ({
  registerCreatorLookSocketHandlers: fns.registerCreatorLookSocketHandlers,
  registerCommentEventConsumer: fns.registerCommentEventConsumer,
}));
vi.mock("#modules/leaderboard/leaderboard.socket.js", () => ({
  registerLeaderboardSocketHandlers: fns.registerLeaderboardSocketHandlers,
  registerLeaderboardEventConsumer: fns.registerLeaderboardEventConsumer,
}));
vi.mock("#modules/creator-leaderboard/creatorLeaderboard.socket.js", () => ({
  registerCreatorLeaderboardSocketHandlers: fns.registerCreatorLeaderboardSocketHandlers,
  registerCreatorLeaderboardEventConsumer: fns.registerCreatorLeaderboardEventConsumer,
}));
vi.mock("#modules/xp/xp.socket.js", () => ({
  registerXpSocketEventConsumer: fns.registerXpSocketEventConsumer,
}));
vi.mock("#modules/achievements/achievement.socket.js", () => ({
  registerAchievementSocketEventConsumer: fns.registerAchievementSocketEventConsumer,
}));
vi.mock("#modules/notifications/notification.socket.js", () => ({
  registerNotificationSocketEventConsumer: fns.registerNotificationSocketEventConsumer,
}));
vi.mock("#modules/chat/chat.socket.js", () => ({
  registerChatSocketEventConsumer: fns.registerChatSocketEventConsumer,
}));
vi.mock("#modules/chat/conversation.socket.js", () => ({
  registerConversationSocketHandlers: fns.registerConversationSocketHandlers,
  registerMessageEventConsumer: fns.registerMessageEventConsumer,
  registerPresenceSocketConsumer: fns.registerPresenceSocketConsumer,
}));
vi.mock("#modules/xp/xp.events.js", () => ({
  registerXpEventConsumers: fns.registerXpEventConsumers,
}));
vi.mock("#modules/achievements/achievement.events.js", () => ({
  registerAchievementEventConsumers: fns.registerAchievementEventConsumers,
}));
vi.mock("#modules/notifications/notification.events.js", () => ({
  registerNotificationEventConsumers: fns.registerNotificationEventConsumers,
}));

const { registerBackgroundConsumers, registerRealtimeConsumers } = await import("./consumers.js");

const REALTIME_REGISTRATIONS = [
  "registerSocketListeners",
  "registerCreatorLookSocketHandlers",
  "registerCommentEventConsumer",
  "registerLeaderboardSocketHandlers",
  "registerLeaderboardEventConsumer",
  "registerCreatorLeaderboardSocketHandlers",
  "registerCreatorLeaderboardEventConsumer",
  "registerXpSocketEventConsumer",
  "registerAchievementSocketEventConsumer",
  "registerNotificationSocketEventConsumer",
  "registerChatSocketEventConsumer",
  "registerConversationSocketHandlers",
  "registerMessageEventConsumer",
  "registerPresenceSocketConsumer",
] as const satisfies ReadonlyArray<keyof typeof fns>;

const BACKGROUND_REGISTRATIONS = [
  "registerXpEventConsumers",
  "registerAchievementEventConsumers",
  "registerNotificationEventConsumers",
] as const satisfies ReadonlyArray<keyof typeof fns>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("process consumer groups", () => {
  it("registerRealtimeConsumers invokes exactly the realtime registrations", () => {
    registerRealtimeConsumers();

    for (const name of REALTIME_REGISTRATIONS) {
      expect(fns[name]).toHaveBeenCalledTimes(1);
    }
    for (const name of BACKGROUND_REGISTRATIONS) {
      expect(fns[name]).not.toHaveBeenCalled();
    }
  });

  it("registerBackgroundConsumers invokes exactly the background registrations", () => {
    registerBackgroundConsumers();

    for (const name of BACKGROUND_REGISTRATIONS) {
      expect(fns[name]).toHaveBeenCalledTimes(1);
    }
    for (const name of REALTIME_REGISTRATIONS) {
      expect(fns[name]).not.toHaveBeenCalled();
    }
  });

  it("the two groups are disjoint and together cover every registration", () => {
    const combined = [...REALTIME_REGISTRATIONS, ...BACKGROUND_REGISTRATIONS];

    expect(new Set(combined).size).toBe(combined.length);
    expect(combined.length).toBe(Object.keys(fns).length);
  });
});
