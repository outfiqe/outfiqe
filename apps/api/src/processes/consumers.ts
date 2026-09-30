import { registerAchievementEventConsumers } from "#modules/achievements/achievement.events.js";
import { registerAchievementSocketEventConsumer } from "#modules/achievements/achievement.socket.js";
import { registerChatOutboxHandlers } from "#modules/chat/chat.outbox.js";
import { registerChatSocketEventConsumer } from "#modules/chat/chat.socket.js";
import {
  registerConversationMembershipConsumer,
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
import { registerOutfitNotificationHandlers } from "#modules/outfits/outfit.notifications.js";
import { registerOutfitRealtimeHandlers } from "#modules/outfits/outfit.realtime.js";
import { registerOutfitSocketHandlers } from "#modules/outfits/outfit.socket.js";
import { registerOutfitStockHandlers } from "#modules/outfits/outfit.stock.js";
import { registerSuspensionNotificationEventConsumers } from "#modules/platform-suspensions/platform-suspensions.events.js";
import { registerSuspensionSocketEventConsumer } from "#modules/platform-suspensions/platform-suspensions.socket.js";
import { registerPushEventConsumer } from "#modules/push/push.events.js";
import { registerTagReportEventConsumers } from "#modules/tag-reports/tagReport.events.js";
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
  registerConversationMembershipConsumer();
  registerPresenceSocketConsumer();
  registerSuspensionSocketEventConsumer();
  registerChatOutboxHandlers();
  registerOutfitSocketHandlers();
  registerOutfitRealtimeHandlers();
};

export const registerBackgroundConsumers = (): void => {
  registerXpEventConsumers();
  registerAchievementEventConsumers();
  registerNotificationEventConsumers();
  registerPushEventConsumer();
  registerTagReportEventConsumers();
  registerSuspensionNotificationEventConsumers();
  registerOutfitNotificationHandlers();
  registerOutfitStockHandlers();
};
