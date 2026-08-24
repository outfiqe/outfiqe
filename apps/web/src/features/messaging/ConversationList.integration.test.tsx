import type { ConversationPreview } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { ConversationList } from "./ConversationList";

const buildConversation = (overrides: Partial<ConversationPreview> = {}): ConversationPreview => ({
  id: "conversation-1",
  type: "DIRECT",
  otherParticipant: {
    id: "user-2",
    name: "Jane Doe",
    handle: "jane",
    avatarUrl: null,
    isOnline: false,
    lastSeenAt: null,
  },
  lastMessagePreview: "Hey there!",
  lastMessageAt: "2026-08-24T10:00:00.000Z",
  unreadCount: 0,
  updatedAt: "2026-08-24T10:00:00.000Z",
  ...overrides,
});

const mockConversations = (items: ConversationPreview[]) => {
  mswServer.use(
    http.get("/api/conversations", () =>
      HttpResponse.json({
        success: true,
        message: "Conversations.",
        data: { items, nextCursor: null },
      }),
    ),
  );
};

const renderList = (onSelect = vi.fn(), activeConversationId?: string) => ({
  onSelect,
  ...render(<ConversationList onSelect={onSelect} activeConversationId={activeConversationId} />, {
    wrapper: createQueryClientWrapper(),
  }),
});

describe("ConversationList", () => {
  it("shows the empty state when there are no conversations", async () => {
    mockConversations([]);
    renderList();

    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });

  it("shows an error state with a retry action", async () => {
    mswServer.use(
      http.get("/api/conversations", () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );
    renderList();

    expect(await screen.findByText("Couldn't load your messages.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders a conversation row with preview, unread badge, and online dot", async () => {
    mockConversations([buildConversation({ unreadCount: 3 })]);
    renderList();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Hey there!")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("calls onSelect with the conversation id when a row is clicked", async () => {
    mockConversations([buildConversation()]);
    const { onSelect } = renderList();
    const user = userEvent.setup();

    await user.click(await screen.findByText("Jane Doe"));

    expect(onSelect).toHaveBeenCalledWith("conversation-1");
  });

  it("shows a load-more button and appends the next page", async () => {
    const secondPageConversation = buildConversation({
      id: "conversation-2",
      otherParticipant: {
        id: "user-3",
        name: "John Smith",
        handle: "john",
        avatarUrl: null,
        isOnline: false,
        lastSeenAt: null,
      },
    });

    mswServer.use(
      http.get("/api/conversations", ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        const data = cursor
          ? { items: [secondPageConversation], nextCursor: null }
          : { items: [buildConversation()], nextCursor: "conversation-1" };
        return HttpResponse.json({ success: true, message: "Conversations.", data });
      }),
    );
    renderList();
    const user = userEvent.setup();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));

    await waitFor(() => expect(screen.getByText("John Smith")).toBeInTheDocument());
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
  });
});
