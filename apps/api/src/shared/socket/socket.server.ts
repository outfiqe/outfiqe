import type { Server as HttpServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import { Server as SocketIOServer } from "socket.io";

import { env } from "#config/env.config.js";
import logger from "#lib/winston.utils.js";
import { redis } from "#redis/redis.client.js";

import { socketAuth } from "./socket.auth.js";
import type { AppSocketServer } from "./socket.types.js";

const userRoom = (userId: string) => `user:${userId}`;

type SocketRuntime = {
  io: AppSocketServer;
  pubClient: ReturnType<typeof redis.duplicate>;
  subClient: ReturnType<typeof redis.duplicate>;
};

let runtime: SocketRuntime | undefined;

export const initSocket = (httpServer: HttpServer): AppSocketServer => {
  if (runtime) throw new Error("Socket.IO has already been initialized.");

  const pubClient = redis.duplicate();
  const subClient = redis.duplicate();

  const io: AppSocketServer = new SocketIOServer(httpServer, {
    cors: { origin: env.ALLOWED_ORIGINS, credentials: true },
    adapter: createAdapter(pubClient, subClient),
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const { userId } = socket.data.auth;
    socket.join(userRoom(userId));
    logger.info(`Socket connected: user=${userId} socket=${socket.id}`);

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: user=${userId} socket=${socket.id} reason=${reason}`);
    });
  });

  runtime = { io, pubClient, subClient };
  return io;
};

export const getIO = (): AppSocketServer => {
  if (!runtime) throw new Error("Socket.IO has not been initialized. Call initSocket first.");
  return runtime.io;
};

export const closeSocket = async (): Promise<void> => {
  if (!runtime) return;
  const { io, pubClient, subClient } = runtime;
  runtime = undefined;

  await new Promise<void>((resolve) => io.close(() => resolve()));
  await Promise.all([pubClient.quit(), subClient.quit()]);
};
