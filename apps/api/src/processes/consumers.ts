import { registerAchievementEventConsumers } from "#modules/achievements/achievement.events.js";
import { registerAchievementSocketEventConsumer } from "#modules/achievements/achievement.socket.js";
import { registerChatSocketEventConsumer } from "#modules/chat/chat.socket.js";
import {
  registerConversationSocketHandlers,
  registerMessageEventConsumer,
  registerPresenceSocketConsumer,
} from "#modules/chat/conversation.socket.js";
import {
  registerCreatorLeaderboardEventConsumer,
  registerCreatorLeaderboardSocketHandlers,
} from "#modules/creator-leaderboard/creatorLeaderboard.socket.js";
import {
  registerCommentEventConsumer,
  registerCreatorLookSocketHandlers,
} from "#modules/creator-looks/creatorLook.socket.js";
import {
  registerLeaderboardEventConsumer,
  registerLeaderboardSocketHandlers,
} from "#modules/leaderboard/leaderboard.socket.js";
import { registerNotificationEventConsumers } from "#modules/notifications/notification.events.js";
import { registerNotificationSocketEventConsumer } from "#modules/notifications/notification.socket.js";
import { registerPushEventConsumer } from "#modules/push/push.events.js";
import { registerXpEventConsumers } from "#modules/xp/xp.events.js";
import { registerXpSocketEventConsumer } from "#modules/xp/xp.socket.js";
import { registerSocketListeners } from "#socket/socket.listeners.js";

export const registerRealtimeConsumers = (): void => {
  registerSocketListeners();
  registerCreatorLookSocketHandlers();
  registerCommentEventConsumer();
  registerLeaderboardSocketHandlers();
  registerLeaderboardEventConsumer();
  registerCreatorLeaderboardSocketHandlers();
  registerCreatorLeaderboardEventConsumer();
  registerXpSocketEventConsumer();
  registerAchievementSocketEventConsumer();
  registerNotificationSocketEventConsumer();
  registerChatSocketEventConsumer();
  registerConversationSocketHandlers();
  registerMessageEventConsumer();
  registerPresenceSocketConsumer();
};

export const registerBackgroundConsumers = (): void => {
  registerXpEventConsumers();
  registerAchievementEventConsumers();
  registerNotificationEventConsumers();
  registerPushEventConsumer();
};
