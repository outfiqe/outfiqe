import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { userRoom } from "./socket.keys.js";
import { getIO } from "./socket.server.js";

const TREATED_AS_OFFLINE = false;

export const isUserOnline = async (userId: string): Promise<boolean> => {
  try {
    const sockets = await getIO().in(userRoom(userId)).fetchSockets();
    return sockets.length > 0;
  } catch (error) {
    logger.error(`Failed to check presence for user ${userId}: ${describeError(error)}`);
    return TREATED_AS_OFFLINE;
  }
};
