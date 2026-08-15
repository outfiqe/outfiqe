import type { DefaultEventsMap, Server, Socket } from "socket.io";

import type { AuthPrincipal } from "#types/token.types.js";

export interface SocketData {
  auth: AuthPrincipal | null;
}

export type LookCreatedPayload = {
  lookId: string;
  creatorId: string;
  createdAt: string;
};

export type FeedSyncRequestPayload = {
  tab: string;
  since: string;
};

export type FeedSyncResultPayload = {
  count: number;
};

// Key literals must match SOCKET_EVENTS in socket.keys.ts.
export type ServerToClientEvents = {
  "look:created": (payload: LookCreatedPayload) => void;
  "feed:sync:result": (payload: FeedSyncResultPayload) => void;
};

export type ClientToServerEvents = {
  "feed:sync:request": (payload: FeedSyncRequestPayload) => void;
};

export type AppSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  DefaultEventsMap,
  SocketData
>;
