import { z } from "zod";

import logger from "#lib/winston.utils.js";
import { featureFlagsService } from "#modules/feature-flags/feature-flags.service.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";
import { OUTFIT_SOCKET_RATE_LIMIT, outfitRoom, SOCKET_EVENTS } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type { AppSocket } from "#socket/socket.types.js";

import { resolveLiveBoardRole } from "./outfit.access.js";
import { outfitService } from "./outfit.service.js";

const FIRST_VERSION = 0;

const subscriptionSchema = z.object({ outfitId: z.uuid() });

const syncRequestSchema = z.object({
  outfitId: z.uuid(),
  sinceVersion: z.number().int().min(FIRST_VERSION),
});

const isWithinSocketRateLimit = async (userId: string): Promise<boolean> => {
  try {
    const messageCount = await redis.incrWithExpiry(
      redisKeys.rateLimit(OUTFIT_SOCKET_RATE_LIMIT.NAMESPACE, userId),
      OUTFIT_SOCKET_RATE_LIMIT.WINDOW_MS,
    );
    return messageCount <= OUTFIT_SOCKET_RATE_LIMIT.MAX_MESSAGES;
  } catch (error) {
    logger.error(`Outfit socket rate limit check failed for ${userId}: ${describeError(error)}`);
    return true;
  }
};

const canWatchLiveBoard = async (userId: string, outfitId: string): Promise<boolean> => {
  if (!(await isWithinSocketRateLimit(userId))) return false;
  if (!(await featureFlagsService.isEnabledForUser("outfit_builder", userId))) return false;
  return (await resolveLiveBoardRole(outfitId, userId)) !== null;
};

const subscribeToBuild = async (socket: AppSocket, rawPayload: unknown): Promise<void> => {
  const parsed = subscriptionSchema.safeParse(rawPayload);
  const userId = socket.data.auth?.userId;
  if (!parsed.success || !userId) return;

  const { outfitId } = parsed.data;
  if (await canWatchLiveBoard(userId, outfitId)) await socket.join(outfitRoom(outfitId));
};

const syncBuild = async (socket: AppSocket, rawPayload: unknown): Promise<void> => {
  const parsed = syncRequestSchema.safeParse(rawPayload);
  const userId = socket.data.auth?.userId;
  if (!parsed.success || !userId) return;

  const { outfitId, sinceVersion } = parsed.data;
  if (!(await canWatchLiveBoard(userId, outfitId))) return;

  const eventsPage = await outfitService.listEvents(userId, outfitId, sinceVersion);
  socket.emit(SOCKET_EVENTS.OUTFIT_SYNC_RESULT, { outfitId, ...eventsPage });
};

const runSafely =
  (socket: AppSocket, action: (socket: AppSocket, rawPayload: unknown) => Promise<void>) =>
  (rawPayload: unknown) => {
    action(socket, rawPayload).catch((error: unknown) => {
      logger.error(`Outfit socket handler failed: ${describeError(error)}`);
    });
  };

export const registerOutfitSocketHandlers = (): void => {
  getIO().on("connection", (socket) => {
    socket.on(SOCKET_EVENTS.OUTFIT_SUBSCRIBE, runSafely(socket, subscribeToBuild));
    socket.on(SOCKET_EVENTS.OUTFIT_SYNC, runSafely(socket, syncBuild));
    socket.on(SOCKET_EVENTS.OUTFIT_UNSUBSCRIBE, (rawPayload: unknown) => {
      const parsed = subscriptionSchema.safeParse(rawPayload);
      if (parsed.success) void socket.leave(outfitRoom(parsed.data.outfitId));
    });
  });
};
