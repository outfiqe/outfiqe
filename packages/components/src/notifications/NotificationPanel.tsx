import type { NotificationsApi } from "@outfiqe/client";
import { Button, Skeleton } from "@outfiqe/design-system";
import { useNotifications } from "@outfiqe/hooks";
import type { Notification } from "@outfiqe/types";
import { Settings } from "lucide-react";
import { useState } from "react";

import { NotificationPreferencesView } from "./NotificationPreferencesView";
import { NotificationRow } from "./NotificationRow";

const SKELETON_ROW_COUNT = 4;

type NotificationPanelProps = {
  notificationsApi: NotificationsApi;
  onSelect: (notification: Notification) => void;
  showPushChannel?: boolean;
};

export const NotificationPanel = ({
  notificationsApi,
  onSelect,
  showPushChannel,
}: NotificationPanelProps) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const { feedQuery, unreadCount, markRead, markAllRead } = useNotifications(notificationsApi);

  const notifications = feedQuery.data?.pages.flatMap((page) => page.notifications) ?? [];

  const handleSelect = (notification: Notification): void => {
    if (!notification.isRead) markRead(notification.id);
    onSelect(notification);
  };

  return (
    <div className="flex max-h-[28rem] w-[22rem] flex-col sm:w-96">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-display text-sm font-bold text-foreground">Notifications</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0}
            onClick={() => markAllRead()}
          >
            Mark all as read
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={showPreferences ? "Back to notifications" : "Notification settings"}
            aria-pressed={showPreferences}
            onClick={() => setShowPreferences((current) => !current)}
          >
            <Settings className="size-4" />
          </Button>
        </div>
      </div>

      {showPreferences ? (
        <NotificationPreferencesView
          notificationsApi={notificationsApi}
          showPushChannel={showPushChannel}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {feedQuery.isLoading && (
            <div className="space-y-2 p-1">
              {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          )}

          {feedQuery.isError && (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <p className="text-sm text-muted-foreground">Couldn&apos;t load notifications.</p>
              <Button variant="outline" size="sm" onClick={() => feedQuery.refetch()}>
                Retry
              </Button>
            </div>
          )}

          {!feedQuery.isLoading && !feedQuery.isError && notifications.length === 0 && (
            <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
              <p className="text-sm font-medium text-foreground">You&apos;re all caught up</p>
              <p className="text-xs text-muted-foreground">New activity will show up here.</p>
            </div>
          )}

          {notifications.map((notification) => (
            <NotificationRow
              key={notification.id}
              notification={notification}
              onSelect={handleSelect}
            />
          ))}

          {feedQuery.hasNextPage && (
            <div className="pt-1 text-center">
              <Button
                variant="ghost"
                size="sm"
                disabled={feedQuery.isFetchingNextPage}
                onClick={() => feedQuery.fetchNextPage()}
              >
                {feedQuery.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
