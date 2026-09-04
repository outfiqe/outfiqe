import { NotificationBell } from "@outfiqe/components";
import type { NotificationSocket } from "@outfiqe/hooks";
import type { Notification } from "@outfiqe/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { notificationsApi } from "@/shared/lib/notificationsApi";

type SocketHandler = (...args: never[]) => void;

class FakeSocket implements NotificationSocket {
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

const buildNotification = (overrides: Partial<Notification> = {}): Notification => ({
  id: "notif-1",
  recipientId: "user-1",
  actorId: "actor-1",
  type: "LOOK_LIKED",
  entityType: "LOOK",
  entityId: "look-1",
  metadata: {
    recentActors: [{ id: "actor-1", name: "Jane", handle: "jane", avatarUrl: null }],
  },
  groupKey: "look-liked:look-1",
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-08-22T10:00:00.000Z",
  updatedAt: "2026-08-22T10:00:00.000Z",
  ...overrides,
});

const mockFeed = (notifications: Notification[]) => {
  mswServer.use(
    http.get("/api/notifications", () =>
      HttpResponse.json({
        success: true,
        message: "Notifications.",
        data: { notifications, nextCursor: null },
      }),
    ),
  );
};

const mockUnreadCount = (count: number) => {
  mswServer.use(
    http.get("/api/notifications/unread-count", () =>
      HttpResponse.json({ success: true, message: "Unread count.", data: { count } }),
    ),
  );
};

const renderBell = (socket: NotificationSocket, onSelect = vi.fn()) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    onSelect,
    ...render(
      <QueryClientProvider client={queryClient}>
        <NotificationBell notificationsApi={notificationsApi} socket={socket} onSelect={onSelect} />
      </QueryClientProvider>,
    ),
  };
};

const openPanel = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /Notifications/ }));
  return user;
};

describe("NotificationBell", () => {
  it("shows the unread count on the trigger badge", async () => {
    mockFeed([]);
    mockUnreadCount(3);
    renderBell(new FakeSocket());

    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument(),
      { timeout: 5000 },
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows the empty state and disables mark-all-read when there is nothing to show", async () => {
    mockFeed([]);
    mockUnreadCount(0);
    renderBell(new FakeSocket());

    await openPanel();

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
  });

  it("marks read and navigates when a row is clicked", async () => {
    const notification = buildNotification();
    mockFeed([notification]);
    mockUnreadCount(1);
    mswServer.use(
      http.patch("/api/notifications/:id/read", () =>
        HttpResponse.json({
          success: true,
          message: "Marked as read.",
          data: { id: notification.id },
        }),
      ),
    );

    const { onSelect } = renderBell(new FakeSocket());
    const user = await openPanel();

    await user.click(await screen.findByText("Jane liked your look"));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: notification.id }));
  });

  it("marks every notification read via mark-all-read", async () => {
    mockFeed([
      buildNotification(),
      buildNotification({ id: "notif-2", groupKey: "look-liked:look-2" }),
    ]);
    mockUnreadCount(2);
    mswServer.use(
      http.patch("/api/notifications/read-all", () =>
        HttpResponse.json({ success: true, message: "Marked all as read.", data: {} }),
      ),
    );

    renderBell(new FakeSocket());
    const user = await openPanel();

    await waitFor(() => expect(screen.getAllByText("Jane liked your look")).toHaveLength(2));
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));

    await waitFor(
      () =>
        expect(screen.getByRole("button", { name: "Notifications, 0 unread" })).toBeInTheDocument(),
      { timeout: 5000 },
    );
  });

  it("replaces a group's card in place on notification:updated, never duplicating it", async () => {
    const notification = buildNotification();
    mockFeed([notification]);
    mockUnreadCount(1);
    const socket = new FakeSocket();

    renderBell(socket);
    await openPanel();

    await screen.findByText("Jane liked your look");

    socket.emit(
      "notification:updated",
      buildNotification({
        actorCount: 2,
        metadata: {
          recentActors: [
            { id: "actor-1", name: "Jane", handle: "jane", avatarUrl: null },
            { id: "actor-2", name: "John", handle: "john", avatarUrl: null },
          ],
        },
        updatedAt: "2026-08-22T10:05:00.000Z",
      }),
    );

    await waitFor(() =>
      expect(screen.getByText("Jane and John liked your look")).toBeInTheDocument(),
    );
    expect(screen.queryByText("Jane liked your look")).not.toBeInTheDocument();
    expect(screen.getAllByText(/liked your look/)).toHaveLength(1);
  });
});
