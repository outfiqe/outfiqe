// Mirrors apps/api/src/shared/socket/socket.keys.ts SOCKET_EVENTS — the two
// can't share a module (api isn't a workspace package), so keep them in sync.
export const EXPLORE_SOCKET_EVENTS = {
  LOOK_CREATED: "look:created",
} as const;

export type LookCreatedPayload = {
  lookId: string;
  creatorId: string;
  createdAt: string;
};
