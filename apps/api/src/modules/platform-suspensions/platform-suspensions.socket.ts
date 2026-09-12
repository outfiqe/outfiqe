import { subscribeToDomainEvent } from "#events/event-bus.consumer.js";
import { DomainEvents } from "#events/event-bus.js";
import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";
import { SOCKET_EVENTS, userRoom } from "#socket/socket.keys.js";
import { getIO } from "#socket/socket.server.js";
import type { AccountSuspendedPayload } from "#socket/socket.types.js";

const SOCKET_BROADCAST_CONSUMER_GROUP = "socket-broadcast";
const DISCONNECT_AFTER_EMIT = true;

const kickUser = async (userId: string, payload: AccountSuspendedPayload): Promise<void> => {
  try {
    const room = userRoom(userId);
    getIO().to(room).emit(SOCKET_EVENTS.ACCOUNT_SUSPENDED, payload);
    await getIO().in(room).disconnectSockets(DISCONNECT_AFTER_EMIT);
  } catch (error) {
    logger.error(
      `Failed to kick suspended user ${userId} off active sockets: ${describeError(error)}`,
    );
  }
};

export const registerSuspensionSocketEventConsumer = (): void => {
  subscribeToDomainEvent({
    event: DomainEvents.USER_SUSPENDED,
    groupName: SOCKET_BROADCAST_CONSUMER_GROUP,
    handler: ({ userId, reason, expiresAt }) => kickUser(userId, { reason, expiresAt }),
  });

  subscribeToDomainEvent({
    event: DomainEvents.USER_BANNED,
    groupName: SOCKET_BROADCAST_CONSUMER_GROUP,
    handler: ({ userId, reason }) => kickUser(userId, { reason, expiresAt: null }),
  });
};
