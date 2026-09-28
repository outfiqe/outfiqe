import {
  NOTIFICATIONS_QUERY_KEY,
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
  type NotificationSocket,
  useNotificationSocket,
} from "@outfiqe/hooks";
import type { Notification, NotificationPage } from "@outfiqe/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

type InfiniteNotificationsData = {
  pages: NotificationPage[];
  pageParams: (string | undefined)[];
};

type SocketListener = (...args: never[]) => void;

const ACME_ORGANIZATION_ID = "org-acme";
const GLOBEX_ORGANIZATION_ID = "org-globex";
const READ_AT = "2026-09-26T12:00:00.000Z";

const buildNotification = (id: string, organizationId: string | null): Notification => ({
  id,
  recipientId: "recipient-1",
  actorId: null,
  type: "CRM_ITEM_ASSIGNED",
  entityType: null,
  entityId: null,
  targetSurface: null,
  targetPath: null,
  organizationId,
  metadata: {},
  groupKey: null,
  actorCount: 1,
  isRead: false,
  readAt: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
});

const buildSocket = () => {
  const listeners = new Map<string, Set<SocketListener>>();
  const emit = (event: string, payload: unknown): void => {
    listeners.get(event)?.forEach((listener) => Reflect.apply(listener, undefined, [payload]));
  };
  const socket: NotificationSocket = {
    on: (event, listener) => {
      const eventListeners = listeners.get(event) ?? new Set<SocketListener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    off: (event, listener) => {
      listeners.get(event)?.delete(listener);
    },
    emit,
  };
  return { socket, emit };
};

const renderSocketHook = (
  cachedNotifications: Notification[],
  unreadCount: number,
  acceptsNotification?: (notification: Notification) => boolean,
) => {
  const queryClient = new QueryClient();
  queryClient.setQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY, {
    pages: [{ notifications: cachedNotifications, nextCursor: null }],
    pageParams: [undefined],
  });
  queryClient.setQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY, unreadCount);

  const { socket, emit } = buildSocket();
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  renderHook(() => useNotificationSocket(socket, acceptsNotification), { wrapper: Wrapper });

  const cachedFeed = () =>
    queryClient.getQueryData<InfiniteNotificationsData>(NOTIFICATIONS_QUERY_KEY)?.pages[0]
      ?.notifications ?? [];
  const cachedUnreadCount = () =>
    queryClient.getQueryData<number>(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY);
  const isUnreadCountStale = () =>
    queryClient.getQueryState(NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY)?.isInvalidated ?? false;

  return { emit, cachedFeed, cachedUnreadCount, isUnreadCountStale };
};

describe("useNotificationSocket", () => {
  it("adds every incoming notification when the bell shows everything", () => {
    const { emit, cachedFeed, cachedUnreadCount } = renderSocketHook([], 0);

    emit("notification:created", buildNotification("n1", null));

    expect(cachedFeed().map(({ id }) => id)).toEqual(["n1"]);
    expect(cachedUnreadCount()).toBe(1);
  });

  it("ignores an incoming notification the bell does not accept", () => {
    const acceptsAcmeOnly = (notification: Notification) =>
      notification.organizationId === ACME_ORGANIZATION_ID;
    const { emit, cachedFeed, cachedUnreadCount } = renderSocketHook([], 0, acceptsAcmeOnly);

    emit("notification:created", buildNotification("storefront", null));
    emit("notification:created", buildNotification("acme-task", ACME_ORGANIZATION_ID));

    expect(cachedFeed().map(({ id }) => id)).toEqual(["acme-task"]);
    expect(cachedUnreadCount()).toBe(1);
  });

  it("ignores an update to a notification the bell does not accept", () => {
    const acceptsNothing = () => false;
    const storefrontNotification = buildNotification("storefront", null);
    const { emit, cachedFeed } = renderSocketHook([storefrontNotification], 1, acceptsNothing);

    emit("notification:updated", { ...storefrontNotification, actorCount: 5 });

    expect(cachedFeed()[0]?.actorCount).toBe(1);
  });

  it("marks everything read and clears the count when all notifications were marked read", () => {
    const { emit, cachedFeed, cachedUnreadCount } = renderSocketHook(
      [buildNotification("n1", null), buildNotification("n2", ACME_ORGANIZATION_ID)],
      2,
    );

    emit("notification:read-all", { readAt: READ_AT });

    expect(cachedFeed().every(({ isRead }) => isRead)).toBe(true);
    expect(cachedUnreadCount()).toBe(0);
  });

  it("marks only one tenant's notifications read and refetches the count", () => {
    const { emit, cachedFeed, isUnreadCountStale } = renderSocketHook(
      [
        buildNotification("acme-task", ACME_ORGANIZATION_ID),
        buildNotification("globex-task", GLOBEX_ORGANIZATION_ID),
        buildNotification("storefront", null),
      ],
      3,
    );

    emit("notification:read-all", { readAt: READ_AT, organizationId: ACME_ORGANIZATION_ID });

    const readIds = cachedFeed()
      .filter(({ isRead }) => isRead)
      .map(({ id }) => id);
    expect(readIds).toEqual(["acme-task"]);
    expect(isUnreadCountStale()).toBe(true);
  });
});
