import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectionHandlers: [] as ((socket: unknown) => void)[],
  incrWithExpiry: vi.fn(),
  isEnabledForUser: vi.fn(),
  resolveLiveBoardRole: vi.fn(),
  listEvents: vi.fn(),
}));

vi.mock("#socket/socket.server.js", () => ({
  getIO: () => ({
    on: (_event: string, handler: (socket: unknown) => void) => {
      mocks.connectionHandlers.push(handler);
    },
  }),
}));
vi.mock("#redis/redis.client.js", () => ({ redis: { incrWithExpiry: mocks.incrWithExpiry } }));
vi.mock("#modules/feature-flags/feature-flags.service.js", () => ({
  featureFlagsService: { isEnabledForUser: mocks.isEnabledForUser },
}));
vi.mock("./outfit.access.js", () => ({ resolveLiveBoardRole: mocks.resolveLiveBoardRole }));
vi.mock("./outfit.service.js", () => ({ outfitService: { listEvents: mocks.listEvents } }));

const { registerOutfitSocketHandlers } = await import("./outfit.socket.js");

const OUTFIT_ID = "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a";
const USER_ID = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";

type Listener = (payload: unknown) => void;

const connectSocket = (userId: string | null) => {
  const listeners = new Map<string, Listener>();
  const socket = {
    data: { auth: userId ? { userId } : undefined },
    on: (event: string, listener: Listener) => listeners.set(event, listener),
    join: vi.fn().mockResolvedValue(undefined),
    leave: vi.fn().mockResolvedValue(undefined),
    emit: vi.fn(),
  };
  for (const handler of mocks.connectionHandlers) handler(socket);
  const send = async (event: string, payload: unknown) => {
    listeners.get(event)?.(payload);
    await new Promise((resolve) => setImmediate(resolve));
  };
  return { socket, send };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connectionHandlers.length = 0;
  registerOutfitSocketHandlers();
  mocks.incrWithExpiry.mockResolvedValue(1);
  mocks.isEnabledForUser.mockResolvedValue(true);
  mocks.resolveLiveBoardRole.mockResolvedValue("EDITOR");
});

describe("outfit socket handlers", () => {
  it("joins the build's room for someone who can see the live board", async () => {
    const { socket, send } = connectSocket(USER_ID);

    await send("outfit:subscribe", { outfitId: OUTFIT_ID });

    expect(socket.join).toHaveBeenCalledWith(`outfit:${OUTFIT_ID}`);
  });

  it("refuses to join without access, with the flag off, when rate limited, or unsigned in", async () => {
    const refusals = [
      () => mocks.resolveLiveBoardRole.mockResolvedValue(null),
      () => mocks.isEnabledForUser.mockResolvedValue(false),
      () => mocks.incrWithExpiry.mockResolvedValue(61),
    ];
    for (const refuse of refusals) {
      refuse();
      const { socket, send } = connectSocket(USER_ID);
      await send("outfit:subscribe", { outfitId: OUTFIT_ID });
      expect(socket.join).not.toHaveBeenCalled();
      mocks.resolveLiveBoardRole.mockResolvedValue("EDITOR");
      mocks.isEnabledForUser.mockResolvedValue(true);
      mocks.incrWithExpiry.mockResolvedValue(1);
    }

    const { socket, send } = connectSocket(null);
    await send("outfit:subscribe", { outfitId: OUTFIT_ID });
    expect(socket.join).not.toHaveBeenCalled();
  });

  it("ignores a malformed subscription", async () => {
    const { socket, send } = connectSocket(USER_ID);

    await send("outfit:subscribe", { outfitId: "not-a-uuid" });

    expect(socket.join).not.toHaveBeenCalled();
  });

  it("answers a sync request with the history since a version", async () => {
    const eventsPage = { events: [], currentVersion: 5, hasMore: false };
    mocks.listEvents.mockResolvedValue(eventsPage);
    const { socket, send } = connectSocket(USER_ID);

    await send("outfit:sync", { outfitId: OUTFIT_ID, sinceVersion: 3 });

    expect(mocks.listEvents).toHaveBeenCalledWith(USER_ID, OUTFIT_ID, 3);
    expect(socket.emit).toHaveBeenCalledWith("outfit:sync-result", {
      outfitId: OUTFIT_ID,
      ...eventsPage,
    });
  });

  it("leaves the room on request", async () => {
    const { socket, send } = connectSocket(USER_ID);

    await send("outfit:unsubscribe", { outfitId: OUTFIT_ID });

    expect(socket.leave).toHaveBeenCalledWith(`outfit:${OUTFIT_ID}`);
  });
});
