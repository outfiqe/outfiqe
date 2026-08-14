export const EXPLORE_ROOM = "explore";

export const userRoom = (userId: string): string => `user:${userId}`;

export const SOCKET_EVENTS = {
  LOOK_CREATED: "look:created",
} as const;

export const SOCKET_RATE_LIMIT = {
  NAMESPACE: "socket-connect",
  WINDOW_MS: 60_000,
  MAX_CONNECTIONS: 30,
} as const;
