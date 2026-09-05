import type { NotificationsApi } from "@outfiqe/client";
import type { Notification } from "@outfiqe/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { NotificationBell } from "./NotificationBell";

vi.mock("@outfiqe/hooks", () => ({
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY: ["notifications", "unread-count"],
  useNotificationSocket: () => {},
}));

vi.mock("./NotificationPanel", () => ({
  NotificationPanel: ({ onSelect }: { onSelect: (notification: Notification) => void }) => (
    <button type="button" onClick={() => onSelect(buildNotification())}>
      Pick notification
    </button>
  ),
}));

vi.mock("./resolveNotificationMessage", () => ({
  resolveNotificationMessage: () => "Someone liked your look",
}));

const buildNotification = (isRead = false): Notification => ({
  id: "notification-1",
  recipientId: "recipient-1",
  actorId: "actor-1",
  type: "LOOK_LIKED",
  entityType: null,
  entityId: null,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead,
  readAt: null,
  createdAt: "2026-09-05T00:00:00.000Z",
  updatedAt: "2026-09-05T00:00:00.000Z",
});

const buildNotificationsApi = (unreadCount: number): NotificationsApi => ({
  list: async () => ({ notifications: [], nextCursor: null }),
  unreadCount: async () => unreadCount,
  markRead: async () => {},
  markAllRead: async () => {},
  listPreferences: async () => [],
  setPreference: async () => {},
});

type SocketHandler = (notification: Notification) => void;

const buildSocket = () => {
  const handlers = new Set<SocketHandler>();
  return {
    on: (_event: string, handler: SocketHandler) => handlers.add(handler),
    off: (_event: string, handler: SocketHandler) => handlers.delete(handler),
    emitCreated: (notification: Notification) =>
      handlers.forEach((handler) => handler(notification)),
    handlerCount: () => handlers.size,
  };
};

type RenderBellOptions = {
  unreadCount?: number;
  socket?: ReturnType<typeof buildSocket>;
  onSelect?: (notification: Notification) => void;
};

const renderBell = ({ unreadCount = 0, socket, onSelect = vi.fn() }: RenderBellOptions = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(
    <NotificationBell
      notificationsApi={buildNotificationsApi(unreadCount)}
      socket={socket}
      onSelect={onSelect}
    />,
    { wrapper: Wrapper },
  );
};

const getBellTrigger = (): HTMLElement => screen.getByRole("button", { name: /notifications/i });

describe("NotificationBell", () => {
  it("gives the trigger a touch-sized hit area that relaxes on desktop", () => {
    renderBell();

    expect(getBellTrigger()).toHaveClass("size-11", "lg:size-10");
  });

  it("sizes the bell icon from the trigger, overriding the Button default", () => {
    renderBell();

    const trigger = getBellTrigger();
    expect(trigger).toHaveClass("[&_svg]:size-6", "lg:[&_svg]:size-5");
    expect(trigger).not.toHaveClass("[&_svg]:size-4");
  });

  it("hides the badge when nothing is unread", async () => {
    renderBell({ unreadCount: 0 });

    await waitFor(() => expect(getBellTrigger()).toHaveAccessibleName("Notifications, 0 unread"));
    expect(getBellTrigger().querySelector("span")).toBeNull();
  });

  it("shows the exact unread count on the badge", async () => {
    renderBell({ unreadCount: 4 });

    await waitFor(() => expect(screen.getByText("4")).toBeInTheDocument());
  });

  it("caps the badge at 9+", async () => {
    renderBell({ unreadCount: 25 });

    await waitFor(() => expect(screen.getByText("9+")).toBeInTheDocument());
  });

  it("announces an incoming unread notification to assistive tech", async () => {
    const socket = buildSocket();
    renderBell({ socket });

    socket.emitCreated(buildNotification());

    await waitFor(() => expect(screen.getByText("Someone liked your look")).toBeInTheDocument());
  });

  it("stays silent for a notification that arrives already read", async () => {
    const socket = buildSocket();
    renderBell({ socket });

    socket.emitCreated(buildNotification(true));

    await waitFor(() =>
      expect(screen.queryByText("Someone liked your look")).not.toBeInTheDocument(),
    );
  });

  it("unsubscribes from the socket on unmount", () => {
    const socket = buildSocket();
    const { unmount } = renderBell({ socket });

    expect(socket.handlerCount()).toBe(1);
    unmount();

    expect(socket.handlerCount()).toBe(0);
  });

  it("closes the popover and forwards the picked notification", async () => {
    const onSelect = vi.fn();
    renderBell({ onSelect });

    await userEvent.click(getBellTrigger());
    await userEvent.click(await screen.findByRole("button", { name: "Pick notification" }));

    expect(onSelect).toHaveBeenCalledWith(buildNotification());
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Pick notification" })).not.toBeInTheDocument(),
    );
  });
});
