import type { ConversationPreview, Message } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { MessageThread } from "./MessageThread";

const CONVERSATION_ID = "conversation-1";

const buildConversation = (overrides: Partial<ConversationPreview> = {}): ConversationPreview => ({
  id: CONVERSATION_ID,
  type: "DIRECT",
  otherParticipant: {
    id: "user-2",
    name: "Jane Doe",
    handle: "jane",
    avatarUrl: null,
    isOnline: true,
    lastSeenAt: null,
  },
  lastMessagePreview: "Hey there!",
  lastMessageAt: "2026-08-24T10:00:00.000Z",
  unreadCount: 0,
  updatedAt: "2026-08-24T10:00:00.000Z",
  ...overrides,
});

const buildMessage = (overrides: Partial<Message> = {}): Message => ({
  id: "message-1",
  conversationId: CONVERSATION_ID,
  senderId: "user-2",
  sender: { id: "user-2", name: "Jane Doe", handle: "jane", avatarUrl: null },
  body: "Hey there!",
  attachments: [],
  createdAt: "2026-08-24T10:00:00.000Z",
  isMine: false,
  isDeliveredToOthers: false,
  isReadByOthers: false,
  ...overrides,
});

const mockConversation = (conversation: ConversationPreview) => {
  mswServer.use(
    http.get(`/api/conversations/${CONVERSATION_ID}`, () =>
      HttpResponse.json({ success: true, message: "Conversation.", data: conversation }),
    ),
  );
};

const mockMessages = (items: Message[]) => {
  mswServer.use(
    http.get(`/api/conversations/${CONVERSATION_ID}/messages`, () =>
      HttpResponse.json({
        success: true,
        message: "Messages.",
        data: { items, nextCursor: null },
      }),
    ),
  );
};

const mockMarkRead = () => {
  mswServer.use(
    http.patch(`/api/conversations/${CONVERSATION_ID}/read`, () =>
      HttpResponse.json({ success: true, message: "Marked as read.", data: {} }),
    ),
  );
};

const renderThread = () =>
  render(<MessageThread conversationId={CONVERSATION_ID} onBack={() => {}} />, {
    wrapper: createQueryClientWrapper(),
  });

describe("MessageThread", () => {
  it("shows the participant's name and presence in the header", async () => {
    mockConversation(buildConversation());
    mockMessages([]);
    mockMarkRead();
    renderThread();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Active now")).toBeInTheDocument();
  });

  it("shows the empty state for a new conversation with no messages", async () => {
    mockConversation(buildConversation());
    mockMessages([]);
    mockMarkRead();
    renderThread();

    expect(await screen.findByText("Say hello")).toBeInTheDocument();
  });

  it("renders messages oldest to newest with sent/delivered/read ticks on my own messages", async () => {
    mockConversation(buildConversation());
    mockMessages([
      buildMessage({
        id: "message-2",
        senderId: "me",
        sender: { id: "me", name: "Me", handle: "me", avatarUrl: null },
        body: "Second, mine, read",
        createdAt: "2026-08-24T10:01:00.000Z",
        isMine: true,
        isDeliveredToOthers: true,
        isReadByOthers: true,
      }),
      buildMessage({ id: "message-1", body: "First, theirs" }),
    ]);
    mockMarkRead();
    renderThread();

    const first = await screen.findByText("First, theirs");
    const second = await screen.findByText("Second, mine, read");
    expect(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sends a message from the composer and shows it optimistically", async () => {
    mockConversation(buildConversation());
    mockMessages([]);
    mockMarkRead();
    mswServer.use(
      http.post(`/api/conversations/${CONVERSATION_ID}/messages`, () =>
        HttpResponse.json({
          success: true,
          message: "Message sent.",
          data: buildMessage({
            id: "message-new",
            senderId: "me",
            sender: { id: "me", name: "Me", handle: "me", avatarUrl: null },
            body: "Hello Jane",
            isMine: true,
          }),
        }),
      ),
    );

    const user = userEvent.setup();
    renderThread();

    const input = await screen.findByPlaceholderText("Type a message");
    await user.type(input, "Hello Jane");
    await waitFor(() => expect(input).toHaveValue("Hello Jane"));

    const sendButton = screen.getByRole("button", { name: "Send message" });
    await waitFor(() => expect(sendButton).toBeEnabled());
    await user.click(sendButton);

    await waitFor(() => expect(screen.getByText("Hello Jane")).toBeInTheDocument());
    expect(input).toHaveValue("");
  });
});
