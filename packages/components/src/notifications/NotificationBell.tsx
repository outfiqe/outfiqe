"use client";

import type { NotificationsApi } from "@outfiqe/client";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@outfiqe/design-system";
import {
  NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
  type NotificationSocket,
  useNotificationSocket,
} from "@outfiqe/hooks";
import type { Notification } from "@outfiqe/types";
import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";

import { NotificationPanel } from "./NotificationPanel";
import { resolveNotificationMessage } from "./resolveNotificationMessage";

const MAX_DISPLAYED_UNREAD_COUNT = 9;

type NotificationBellProps = {
  notificationsApi: NotificationsApi;
  socket?: NotificationSocket | null;
  onSelect: (notification: Notification) => void;
  showPushChannel?: boolean;
};

const formatBadgeCount = (count: number): string =>
  count > MAX_DISPLAYED_UNREAD_COUNT ? `${MAX_DISPLAYED_UNREAD_COUNT}+` : `${count}`;

export const NotificationBell = ({
  notificationsApi,
  socket,
  onSelect,
  showPushChannel,
}: NotificationBellProps) => {
  const [open, setOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const unreadCountQuery = useQuery({
    queryKey: NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY,
    queryFn: () => notificationsApi.unreadCount(),
  });

  useNotificationSocket(socket);

  useEffect(() => {
    if (!socket) return;

    const handleCreated = (notification: Notification): void => {
      if (!notification.isRead) setAnnouncement(resolveNotificationMessage(notification));
    };

    socket.on("notification:created", handleCreated);
    return () => {
      socket.off("notification:created", handleCreated);
    };
  }, [socket]);

  const unreadCount = unreadCountQuery.data ?? 0;

  const handleSelect = (notification: Notification): void => {
    setOpen(false);
    onSelect(notification);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Notifications, ${unreadCount} unread`}
          className="relative size-11 [&_svg]:size-6 lg:size-10 lg:[&_svg]:size-5"
        >
          <Bell />
          {unreadCount > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white"
            >
              {formatBadgeCount(unreadCount)}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent>
        <NotificationPanel
          notificationsApi={notificationsApi}
          onSelect={handleSelect}
          showPushChannel={showPushChannel}
        />
      </PopoverContent>

      <span aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </Popover>
  );
};
