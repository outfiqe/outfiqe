import { cn, LogoMark } from "@outfiqe/design-system";
import type { Notification, RecentActor } from "@outfiqe/types";

import { formatNotificationTimestamp } from "./formatNotificationTimestamp";
import { NotificationAvatar } from "./NotificationAvatar";
import { resolveNotificationMessage } from "./resolveNotificationMessage";

const MAX_STACKED_AVATARS = 3;

const ActorStack = ({ actors }: { actors: RecentActor[] }) => {
  const shown = actors.slice(0, MAX_STACKED_AVATARS);
  const [only] = shown;

  if (shown.length <= 1) {
    return (
      <div className="size-10 shrink-0">
        {only ? (
          <NotificationAvatar actor={only} />
        ) : (
          <div className="flex size-full items-center justify-center rounded-full bg-muted p-2 ring-2 ring-card">
            <LogoMark className="size-full" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {shown.map((actor, index) => (
        <div
          key={actor.id}
          className={cn("size-7 shrink-0 rounded-full", index > 0 && "-ml-2.5")}
          style={{ zIndex: shown.length - index }}
        >
          <NotificationAvatar actor={actor} />
        </div>
      ))}
    </div>
  );
};

type NotificationRowProps = {
  notification: Notification;
  onSelect: (notification: Notification) => void;
};

export const NotificationRow = ({ notification, onSelect }: NotificationRowProps) => {
  const { metadata, isRead, updatedAt } = notification;
  const recentActors = metadata.recentActors ?? (metadata.actor ? [metadata.actor] : []);
  const thumbnailUrl = metadata.lookImageUrl;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      aria-current={isRead ? undefined : "true"}
      className={cn(
        "flex w-full cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted",
        !isRead && "bg-primary/5",
      )}
    >
      <span className="relative shrink-0 self-center">
        {!isRead && (
          <span
            aria-hidden
            className="absolute -left-1.5 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary"
          />
        )}
        <ActorStack actors={recentActors} />
      </span>

      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm", isRead ? "text-muted-foreground" : "text-foreground")}>
          {resolveNotificationMessage(notification)}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatNotificationTimestamp(updatedAt)}
        </span>
      </span>

      {thumbnailUrl && (
        <span
          aria-hidden
          className="size-10 shrink-0 overflow-hidden rounded-md bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        />
      )}
    </button>
  );
};
