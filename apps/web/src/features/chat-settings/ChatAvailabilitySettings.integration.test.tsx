import type { EventSocket } from "@outfiqe/hooks";
import type { BlockedChatContact, ChatContact } from "@outfiqe/types";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { ChatAvailabilitySettings } from "./ChatAvailabilitySettings";

type SocketHandler = (...args: never[]) => void;

class FakeSocket implements EventSocket {
  private readonly handlers = new Map<string, Set<SocketHandler>>();

  on(event: string, handler: SocketHandler): this {
    const existing = this.handlers.get(event) ?? new Set();
    existing.add(handler);
    this.handlers.set(event, existing);
    return this;
  }

  off(event: string, handler: SocketHandler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    this.handlers
      .get(event)
      ?.forEach((handler) => (handler as (...args: unknown[]) => void)(...args));
    return true;
  }
}

const mockSettings = (isChatEnabled: boolean) => {
  mswServer.use(
    http.get("/api/chat/settings", () =>
      HttpResponse.json({ success: true, message: "Chat settings.", data: { isChatEnabled } }),
    ),
    http.patch("/api/chat/settings", async ({ request }) => {
      const body = (await request.json()) as { isChatEnabled: boolean };
      return HttpResponse.json({
        success: true,
        message: "Chat settings updated.",
        data: { isChatEnabled: body.isChatEnabled },
      });
    }),
  );
};

const mockBlocks = (items: BlockedChatContact[]) => {
  mswServer.use(
    http.get("/api/chat/blocks", () =>
      HttpResponse.json({
        success: true,
        message: "Blocked chat contacts.",
        data: { items, nextCursor: null },
      }),
    ),
  );
};

const mockContactSearch = (contacts: ChatContact[]) => {
  mswServer.use(
    http.get("/api/chat/blocks/search", () =>
      HttpResponse.json({ success: true, message: "Chat contacts.", data: { contacts } }),
    ),
  );
};

const buildContact = (overrides: Partial<ChatContact> = {}): ChatContact => ({
  id: "contact-1",
  name: "Jane Doe",
  handle: "jane",
  avatarUrl: null,
  ...overrides,
});

const renderSettings = (socket: EventSocket) =>
  render(<ChatAvailabilitySettings socket={socket} />, { wrapper: createQueryClientWrapper() });

describe("ChatAvailabilitySettings", () => {
  it("shows the global toggle unchecked while chat is enabled, checked once turned off", async () => {
    mockSettings(true);
    mockBlocks([]);
    renderSettings(new FakeSocket());

    const toggle = await screen.findByRole("checkbox", { name: "Turn off chat" });
    expect(toggle).not.toBeChecked();

    mswServer.use(
      http.patch("/api/chat/settings", () =>
        HttpResponse.json({
          success: true,
          message: "Chat settings updated.",
          data: { isChatEnabled: false },
        }),
      ),
    );

    const user = userEvent.setup();
    await user.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
  });

  it("shows the empty state when nothing is turned off", async () => {
    mockSettings(true);
    mockBlocks([]);
    renderSettings(new FakeSocket());

    expect(await screen.findByText("You haven't turned off chat with anyone.")).toBeInTheDocument();
  });

  it("turns off chat with a searched contact and lists them as blocked", async () => {
    mockSettings(true);
    mockBlocks([]);
    mockContactSearch([buildContact()]);
    mswServer.use(
      http.post("/api/chat/blocks/contact-1", () =>
        HttpResponse.json({
          success: true,
          message: "Chat turned off with this person.",
          data: {},
        }),
      ),
    );
    renderSettings(new FakeSocket());

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Search by name or handle"), "Jane");

    await user.click(await screen.findByRole("button", { name: "Turn off chat" }));

    expect(await screen.findByRole("button", { name: "Turn chat back on" })).toBeInTheDocument();
    expect(screen.getAllByText("Jane Doe")).toHaveLength(1);
  });

  it("turns chat back on for a blocked contact", async () => {
    mockSettings(true);
    mockBlocks([{ ...buildContact(), blockedAt: "2026-08-24T00:00:00.000Z" }]);
    mockContactSearch([]);
    mswServer.use(
      http.delete("/api/chat/blocks/contact-1", () =>
        HttpResponse.json({
          success: true,
          message: "Chat turned back on with this person.",
          data: {},
        }),
      ),
    );
    renderSettings(new FakeSocket());

    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Turn chat back on" }));

    await waitFor(() =>
      expect(screen.getByText("You haven't turned off chat with anyone.")).toBeInTheDocument(),
    );
  });

  it("reflects a chat:settings:updated socket event without a manual refetch", async () => {
    mockSettings(true);
    mockBlocks([]);
    const socket = new FakeSocket();
    renderSettings(socket);

    const toggle = await screen.findByRole("checkbox", { name: "Turn off chat" });
    expect(toggle).not.toBeChecked();

    socket.emit("chat:settings:updated", { isChatEnabled: false });

    await waitFor(() => expect(toggle).toBeChecked());
  });
});
