import { beforeEach, describe, expect, it, vi } from "vitest";

const socketMocks = vi.hoisted(() => {
  const socketsLeave = vi.fn();
  const emit = vi.fn();
  const inRoom = vi.fn(() => ({ socketsLeave }));
  const toRoom = vi.fn(() => ({ emit }));
  return { socketsLeave, emit, inRoom, toRoom, subscribe: vi.fn() };
});

vi.mock("#socket/socket.server.js", () => ({
  getIO: () => ({ in: socketMocks.inRoom, to: socketMocks.toRoom }),
}));
vi.mock("#events/event-bus.consumer.js", () => ({
  subscribeToDomainEvent: socketMocks.subscribe,
}));
vi.mock("#modules/notifications/notification.service.js", () => ({ notificationService: {} }));

const { DomainEvents } = await import("#events/event-bus.js");
const { conversationRoom, SOCKET_EVENTS, userRoom } = await import("#socket/socket.keys.js");
const { registerConversationMembershipConsumer } = await import("./conversation.socket.js");

const CONVERSATION_ID = "conversation-1";
const REMOVED_USER_ID = "user-removed";

type MembershipHandler = (payload: { conversationId: string; userId: string }) => Promise<void>;

const registeredHandler = (): MembershipHandler => {
  registerConversationMembershipConsumer();
  const [subscription] = socketMocks.subscribe.mock.calls.at(-1) ?? [];
  expect(subscription.event).toBe(DomainEvents.CONVERSATION_MEMBER_REMOVED);
  return subscription.handler;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerConversationMembershipConsumer", () => {
  it("pulls every open tab of a removed member out of the conversation room", async () => {
    await registeredHandler()({ conversationId: CONVERSATION_ID, userId: REMOVED_USER_ID });

    expect(socketMocks.inRoom).toHaveBeenCalledWith(userRoom(REMOVED_USER_ID));
    expect(socketMocks.socketsLeave).toHaveBeenCalledWith(conversationRoom(CONVERSATION_ID));
  });

  it("tells the removed member's devices to drop the conversation from their list", async () => {
    await registeredHandler()({ conversationId: CONVERSATION_ID, userId: REMOVED_USER_ID });

    expect(socketMocks.toRoom).toHaveBeenCalledWith(userRoom(REMOVED_USER_ID));
    expect(socketMocks.emit).toHaveBeenCalledWith(SOCKET_EVENTS.CONVERSATION_REMOVED, {
      conversationId: CONVERSATION_ID,
    });
  });

  it("logs instead of throwing when the socket server isn't available", async () => {
    socketMocks.inRoom.mockImplementationOnce(() => {
      throw new Error("socket server not started");
    });

    await expect(
      registeredHandler()({ conversationId: CONVERSATION_ID, userId: REMOVED_USER_ID }),
    ).resolves.toBeUndefined();
  });
});
