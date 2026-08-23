import { io, type Socket } from "socket.io-client";

import { getAccessToken } from "./apiClient";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

const RECONNECTION_DELAY_MS = 1_000;
const RECONNECTION_DELAY_MAX_MS = 10_000;
const RECONNECTION_JITTER_RATIO = 0.5;

let socket: Socket | null = null;
let connectionCount = 0;

export const getSocket = (): Socket => {
  socket ??= io(SOCKET_URL, {
    autoConnect: false,
    withCredentials: true,
    auth: (cb) => cb({ token: getAccessToken() }),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: RECONNECTION_DELAY_MS,
    reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
    randomizationFactor: RECONNECTION_JITTER_RATIO,
  });

  return socket;
};

export const acquireSocketConnection = (): Socket => {
  const activeSocket = getSocket();
  connectionCount += 1;
  activeSocket.connect();
  return activeSocket;
};

export const releaseSocketConnection = (): void => {
  if (connectionCount === 0) return;

  connectionCount -= 1;
  if (connectionCount === 0) socket?.disconnect();
};
