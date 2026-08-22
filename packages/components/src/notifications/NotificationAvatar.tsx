import { cn } from "@outfiqe/design-system";
import type { RecentActor } from "@outfiqe/types";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";

type NotificationAvatarProps = {
  actor: RecentActor;
  className?: string;
};

export const NotificationAvatar = ({ actor, className }: NotificationAvatarProps) => (
  <div
    className={cn(
      "size-full overflow-hidden rounded-full bg-cover bg-center ring-2 ring-card",
      className,
    )}
    style={actor.avatarUrl ? { backgroundImage: `url(${actor.avatarUrl})` } : undefined}
  >
    {!actor.avatarUrl && (
      <span
        aria-hidden
        className="flex size-full items-center justify-center text-xs font-bold text-white"
        style={{ backgroundColor: getAvatarColor(actor.id) }}
      >
        {initialsFor(actor.name)}
      </span>
    )}
  </div>
);
