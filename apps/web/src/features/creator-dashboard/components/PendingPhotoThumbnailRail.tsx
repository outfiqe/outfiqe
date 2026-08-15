"use client";

import { X } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import type { PendingPhoto } from "../hooks/usePendingPhotos";

type PendingPhotoThumbnailRailProps = {
  photos: PendingPhoto[];
  activePhotoId: string | null | undefined;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export const PendingPhotoThumbnailRail = ({
  photos,
  activePhotoId,
  onSelect,
  onRemove,
}: PendingPhotoThumbnailRailProps) => {
  if (photos.length <= 1) return null;

  return (
    <div className="flex gap-2 overflow-x-auto overflow-y-hidden">
      {photos.map((photo) => (
        <div key={photo.id} className="group relative size-14 shrink-0">
          <button
            type="button"
            onClick={() => onSelect(photo.id)}
            aria-label="Select photo"
            aria-pressed={photo.id === activePhotoId}
            className={cn(
              "size-full overflow-hidden rounded-lg bg-cover bg-center ring-2 ring-offset-2 ring-offset-background transition-shadow",
              photo.id === activePhotoId ? "ring-foreground" : "ring-transparent hover:ring-border",
            )}
            style={{ backgroundImage: `url(${photo.objectUrl})` }}
          />
          <button
            type="button"
            onClick={() => onRemove(photo.id)}
            aria-label="Remove photo"
            className="absolute right-0.5 top-0.5 flex size-4 items-center justify-center rounded-full bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="size-2.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
