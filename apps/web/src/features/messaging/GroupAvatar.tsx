import type { ChatContact } from "@outfiqe/types";

import { AppImage } from "@/shared/components/AppImage";
import { getAvatarColor, initialsFor } from "@/shared/lib/avatarColor";
import { cn } from "@/shared/lib/cn";

const STACKED_FACE_COUNT = 2;

type GroupAvatarProps = {
  members: ChatContact[];
  fallbackKey: string;
  sizeClassName: string;
};

export const GroupAvatar = ({ members, fallbackKey, sizeClassName }: GroupAvatarProps) => {
  const faces = members.slice(0, STACKED_FACE_COUNT);

  return (
    <span aria-hidden className={cn("relative block shrink-0", sizeClassName)}>
      {faces.length === 0 && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: getAvatarColor(fallbackKey) }}
        />
      )}
      {faces.map((member, index) => (
        <span
          key={member.id}
          className={cn(
            "absolute flex size-[70%] items-center justify-center overflow-hidden rounded-full border-2 border-card text-[10px] font-bold text-white",
            index === 0 ? "left-0 top-0" : "bottom-0 right-0",
          )}
          style={member.avatarUrl ? undefined : { backgroundColor: getAvatarColor(member.id) }}
        >
          {member.avatarUrl ? (
            <AppImage src={member.avatarUrl} alt="" fill sizes="32px" />
          ) : (
            initialsFor(member.name)
          )}
        </span>
      ))}
    </span>
  );
};
