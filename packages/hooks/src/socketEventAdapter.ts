"use client";

import type { Socket } from "socket.io-client";

export interface EventSocket {
  on(event: string, handler: (...args: never[]) => void): unknown;
  off(event: string, handler: (...args: never[]) => void): unknown;
  emit(event: string, payload?: unknown): unknown;
}

const eventSocketAdapters = new WeakMap<Socket, EventSocket>();

export const toEventSocket = (socket: Socket): EventSocket => {
  const existing = eventSocketAdapters.get(socket);
  if (existing) return existing;

  const adapter: EventSocket = {
    on: (event, handler) => socket.on(event as never, handler as never),
    off: (event, handler) => socket.off(event as never, handler as never),
    emit: (event, payload) => socket.emit(event as never, payload as never),
  };
  eventSocketAdapters.set(socket, adapter);
  return adapter;
};
