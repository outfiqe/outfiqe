import type { ConversationPreview, Message } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MessagesPageLayout } from "./MessagesPageLayout";

let currentPathname = "/messages";

vi.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

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

const buildMessage = (): Message => ({
  id: "message-1",
  conversationId: CONVERSATION_ID,
  senderId: "user-2",
  sender: { id: "user-2", name: "Jane Doe", handle: "jane", avatarUrl: null },
  body: "Let us meet tomorrow.",
  attachments: [],
  createdAt: "2026-08-24T10:00:00.000Z",
  isMine: false,
  isDeliveredToOthers: false,
  isReadByOthers: false,
});

const mockMessagingEndpoints = () => {
  mswServer.use(
    http.get("/api/conversations", () =>
      HttpResponse.json({
        success: true,
        message: "Conversations.",
        data: { items: [buildConversation()], nextCursor: null },
      }),
    ),
    http.get(`/api/conversations/${CONVERSATION_ID}`, () =>
      HttpResponse.json({ success: true, message: "Conversation.", data: buildConversation() }),
    ),
    http.get(`/api/conversations/${CONVERSATION_ID}/messages`, () =>
      HttpResponse.json({
        success: true,
        message: "Messages.",
        data: { items: [buildMessage()], nextCursor: null },
      }),
    ),
    http.patch(`/api/conversations/${CONVERSATION_ID}/read`, () =>
      HttpResponse.json({ success: true, message: "Marked as read.", data: {} }),
    ),
  );
};

const renderLayout = (conversationId?: string) =>
  render(<MessagesPageLayout conversationId={conversationId} />, {
    wrapper: createQueryClientWrapper(),
  });

afterEach(() => {
  currentPathname = "/messages";
  vi.restoreAllMocks();
});

describe("MessagesPageLayout", () => {
  it("shows the prompt to pick a conversation when the path has no id", async () => {
    mockMessagingEndpoints();
    renderLayout();

    expect(await screen.findByText("Select a conversation")).toBeInTheDocument();
  });

  it("opens a conversation by updating the URL in place instead of navigating", async () => {
    mockMessagingEndpoints();
    const pushState = vi.spyOn(window.history, "pushState");
    const user = userEvent.setup();
    renderLayout();

    await user.click(await screen.findByText("Jane Doe"));

    expect(pushState).toHaveBeenCalledWith(null, "", `/messages/${CONVERSATION_ID}`);
  });

  it("renders the thread for the conversation id already in the path", async () => {
    currentPathname = `/messages/${CONVERSATION_ID}`;
    mockMessagingEndpoints();
    renderLayout(CONVERSATION_ID);

    expect(await screen.findByText("Active now")).toBeInTheDocument();
    expect(await screen.findByText("Let us meet tomorrow.")).toBeInTheDocument();
  });
});
