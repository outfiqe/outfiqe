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

// Key literal must match SOCKET_EVENTS.LOOK_CREATED in socket.keys.ts.
export type ServerToClientEvents = {
  "look:created": (payload: LookCreatedPayload) => void;
};

export type ClientToServerEvents = Record<string, never>;

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
