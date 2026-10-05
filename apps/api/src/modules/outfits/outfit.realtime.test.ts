import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma } from "#generated/prisma/client.js";

const mocks = vi.hoisted(() => {
  const emit = vi.fn();
  const socketsLeave = vi.fn();
  return {
    emit,
    socketsLeave,
    to: vi.fn(() => ({ emit })),
    in: vi.fn(() => ({ socketsLeave })),
    isRolledOutToAnyone: vi.fn(),
    resolveLiveBoardRole: vi.fn(),
  };
});

vi.mock("#socket/socket.server.js", () => ({
  getIO: () => ({ to: mocks.to, in: mocks.in }),
}));
vi.mock("#modules/feature-flags/feature-flags.service.js", () => ({
  featureFlagsService: { isRolledOutToAnyone: mocks.isRolledOutToAnyone },
}));
vi.mock("./outfit.access.js", () => ({ resolveLiveBoardRole: mocks.resolveLiveBoardRole }));

const { broadcastOutfitChange } = await import("./outfit.realtime.js");

const OUTFIT_ID = "3c2b1a09-8f7e-4d6c-9b5a-4f3e2d1c0b9a";
const ACTOR_ID = "7a8b9c0d-1e2f-4a3b-8c4d-5e6f7a8b9c0d";
const EDITOR_ID = "0b6c9a2e-7d4f-4e1a-8b3c-9d8e7f6a5b4c";

const jobFor = (eventType: string, details: Prisma.JsonObject = {}) => ({
  outboxEventId: "event-1",
  aggregateId: OUTFIT_ID,
  payload: {
    outfitId: OUTFIT_ID,
    version: 4,
    eventType,
    actorId: ACTOR_ID,
    details,
    occurredAt: "2026-09-30T10:00:00.000Z",
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isRolledOutToAnyone.mockResolvedValue(true);
});

describe("broadcastOutfitChange", () => {
  it("tells everyone watching the board which version it is now at", async () => {
    await broadcastOutfitChange(jobFor("ITEM_ADDED"));

    expect(mocks.to).toHaveBeenCalledWith(`outfit:${OUTFIT_ID}`);
    expect(mocks.emit).toHaveBeenCalledWith("outfit:updated", {
      outfitId: OUTFIT_ID,
      version: 4,
      eventType: "ITEM_ADDED",
      actorId: ACTOR_ID,
    });
  });

  it("takes a removed editor off the live board when they can no longer see it", async () => {
    mocks.resolveLiveBoardRole.mockResolvedValue(null);

    await broadcastOutfitChange(jobFor("MEMBER_REMOVED", { userId: EDITOR_ID }));

    expect(mocks.in).toHaveBeenCalledWith(`user:${EDITOR_ID}`);
    expect(mocks.socketsLeave).toHaveBeenCalledWith(`outfit:${OUTFIT_ID}`);
    expect(mocks.emit).toHaveBeenCalledWith("outfit:removed", { outfitId: OUTFIT_ID });
  });

  it("keeps someone watching who can still see the board from the chat it started in", async () => {
    mocks.resolveLiveBoardRole.mockResolvedValue("VIEWER");

    await broadcastOutfitChange(jobFor("MEMBER_LEFT", { userId: EDITOR_ID }));

    expect(mocks.socketsLeave).not.toHaveBeenCalled();
  });

  it("stays quiet when the feature is switched off or the payload is unreadable", async () => {
    mocks.isRolledOutToAnyone.mockResolvedValue(false);
    await broadcastOutfitChange(jobFor("ITEM_ADDED"));

    mocks.isRolledOutToAnyone.mockResolvedValue(true);
    await broadcastOutfitChange({ outboxEventId: "event-2", aggregateId: OUTFIT_ID, payload: {} });

    expect(mocks.emit).not.toHaveBeenCalled();
  });
});
