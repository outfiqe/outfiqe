import type { DefaultEventsMap, Server, Socket } from "socket.io";

import type { AuthPrincipal } from "#types/token.types.js";

export interface SocketData {
  auth: AuthPrincipal;
}

export type AppSocketServer = Server<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  SocketData
>;
export type AppSocket = Socket<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, SocketData>;
