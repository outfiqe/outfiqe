import type { ConversationPreview, Message } from "@outfiqe/types";
import { QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import {
  createQueryClientWrapper,
  createTestQueryClient,
} from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { MessageThread } from "./MessageThread";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

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
  group: null,
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
  kind: "USER",
  systemEvent: null,
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

  it("shows a loading placeholder, not the word Conversation, until the participant is known", async () => {
    mswServer.use(
      http.get(`/api/conversations/${CONVERSATION_ID}`, async () => {
        await delay(150);
        return HttpResponse.json({
          success: true,
          message: "Conversation.",
          data: buildConversation(),
        });
      }),
    );
    mockMessages([]);
    mockMarkRead();
    renderThread();

    expect(screen.getByRole("status", { name: "Loading conversation" })).toBeInTheDocument();
    expect(screen.queryByText("Conversation")).not.toBeInTheDocument();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading conversation" })).not.toBeInTheDocument();
  });

  it("shows the name straight away from the conversation list the shopper just clicked in", async () => {
    mswServer.use(
      http.get(`/api/conversations/${CONVERSATION_ID}`, async () => {
        await delay(150);
        return HttpResponse.json({
          success: true,
          message: "Conversation.",
          data: buildConversation(),
        });
      }),
    );
    mockMessages([]);
    mockMarkRead();
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["conversations"], {
      pages: [{ items: [buildConversation()], nextCursor: null }],
      pageParams: [undefined],
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MessageThread conversationId={CONVERSATION_ID} onBack={() => {}} />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.queryByText("Conversation")).not.toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading conversation" })).not.toBeInTheDocument();

    await waitFor(() => {
      expect(queryClient.isFetching()).toBe(0);
      expect(queryClient.isMutating()).toBe(0);
    });
  });

  it("falls back to a generic title when the conversation has no other participant", async () => {
    mockConversation(buildConversation({ otherParticipant: null }));
    mockMessages([]);
    mockMarkRead();
    renderThread();

    expect(await screen.findByText("Conversation")).toBeInTheDocument();
  });
});

describe("MessageThread in a group", () => {
  const SITA = { id: "user-sita", name: "Sita Rai", handle: "sita", avatarUrl: null };
  const RAM = { id: "user-ram", name: "Ram Thapa", handle: "ram", avatarUrl: null };

  const buildGroupConversation = () =>
    buildConversation({
      type: "GROUP",
      otherParticipant: null,
      group: { name: "Dashain outfits", memberCount: 3, members: [SITA, RAM], myRole: "MEMBER" },
    });

  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      state: { user: { id: "me" } },
    } as ReturnType<typeof useAuth>);
  });

  it("shows the group's name and size in the header, with a way into group info", async () => {
    mockConversation(buildGroupConversation());
    mockMessages([]);
    mockMarkRead();
    renderThread();

    expect(await screen.findByText("Dashain outfits")).toBeInTheDocument();
    expect(screen.getByText("3 people")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Group info" })).toBeInTheDocument();
    expect(await screen.findByText("This is the start of the group.")).toBeInTheDocument();
  });

  it("labels who is talking, once per run of messages, and shows group events as plain lines", async () => {
    mockConversation(buildGroupConversation());
    mockMessages([
      buildMessage({
        id: "message-3",
        senderId: SITA.id,
        sender: SITA,
        body: "Or maroon?",
        createdAt: "2026-08-24T10:03:00.000Z",
      }),
      buildMessage({
        id: "message-2",
        senderId: SITA.id,
        sender: SITA,
        body: "Gold kurta?",
        createdAt: "2026-08-24T10:02:00.000Z",
      }),
      buildMessage({
        id: "message-1",
        senderId: SITA.id,
        sender: SITA,
        kind: "SYSTEM",
        body: null,
        systemEvent: { type: "MEMBERS_ADDED", members: [{ id: RAM.id, name: RAM.name }] },
        createdAt: "2026-08-24T10:01:00.000Z",
      }),
    ]);
    mockMarkRead();
    renderThread();

    expect(await screen.findByText("Sita Rai added Ram Thapa")).toBeInTheDocument();
    expect(screen.getByText("Gold kurta?")).toBeInTheDocument();
    expect(screen.getAllByText("Sita Rai")).toHaveLength(1);
  });

  it("explains when the viewer is no longer in the conversation", async () => {
    mswServer.use(
      http.get(`/api/conversations/${CONVERSATION_ID}`, () =>
        HttpResponse.json(
          {
            success: false,
            message: "You don't have access to this conversation.",
            code: "NOT_A_PARTICIPANT",
          },
          { status: 403 },
        ),
      ),
    );
    mockMessages([]);
    mockMarkRead();
    renderThread();

    expect(
      await screen.findByText("This conversation isn't available any more"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
