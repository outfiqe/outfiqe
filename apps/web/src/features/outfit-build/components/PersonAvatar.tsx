"use client";

import { cn } from "@outfiqe/design-system";
import { getAvatarColor, initialsFor } from "@outfiqe/utils";

import { AppImage } from "@/shared/components/AppImage";

type PersonAvatarProps = {
  person: { id: string; name: string; avatarUrl: string | null };
  className?: string;
};

export const PersonAvatar = ({ person, className }: PersonAvatarProps) => (
  <span
    aria-hidden
    className={cn(
      "relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-white",
      className,
    )}
    style={person.avatarUrl ? undefined : { backgroundColor: getAvatarColor(person.id) }}
  >
    {person.avatarUrl ? (
      <AppImage src={person.avatarUrl} alt="" fill sizes="32px" />
    ) : (
      initialsFor(person.name)
    )}
  </span>
);
