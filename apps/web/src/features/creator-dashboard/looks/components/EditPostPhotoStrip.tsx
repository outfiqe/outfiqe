"use client";

import { HiddenFileInput } from "@outfiqe/design-system";
import { ImagePlus, X } from "lucide-react";
import type { RefObject } from "react";

import { MAX_PHOTOS } from "../constants/postModal.constants";
import type { NewLookPhoto } from "../types/newLookPhoto";

type EditPostPhotoStripProps = {
  existingUrls: string[];
  newPhotos: NewLookPhoto[];
  canAddPhoto: boolean;
  hasStagingPhoto: boolean;
  photoError: string | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFilesSelected: (fileList: FileList | null) => Promise<void>;
  removeExistingPhoto: (url: string) => void;
  removeNewPhoto: (id: string) => void;
};

export const EditPostPhotoStrip = ({
  existingUrls,
  newPhotos,
  canAddPhoto,
  hasStagingPhoto,
  photoError,
  fileInputRef,
  handleFilesSelected,
  removeExistingPhoto,
  removeNewPhoto,
}: EditPostPhotoStripProps) => (
  <div>
    <div className="flex flex-wrap gap-2">
      {existingUrls.map((url) => (
        <div key={url} className="group relative size-20 shrink-0">
          <div
            className="size-full overflow-hidden rounded-xl bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${url})` }}
          />
          <button
            type="button"
            onClick={() => removeExistingPhoto(url)}
            aria-label="Remove photo"
            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}

      {newPhotos.map((photo) => (
        <div key={photo.id} className="group relative size-20 shrink-0">
          <div
            className="size-full overflow-hidden rounded-xl bg-muted bg-cover bg-center"
            style={{ backgroundImage: `url(${photo.objectUrl})` }}
          />
          <button
            type="button"
            onClick={() => removeNewPhoto(photo.id)}
            aria-label="Remove photo"
            className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}

      {canAddPhoto && !hasStagingPhoto && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Add a photo"
          className="flex size-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-muted-foreground transition-colors hover:text-foreground"
        >
          <ImagePlus className="size-5" />
          <span className="text-[11px] font-medium">Add</span>
        </button>
      )}
    </div>

    <HiddenFileInput inputRef={fileInputRef} onFilesSelected={handleFilesSelected} />

    <p className="mt-1.5 text-xs text-muted-foreground">
      {existingUrls.length + newPhotos.length}/{MAX_PHOTOS} photos
    </p>

    {photoError && <p className="mt-1.5 text-xs text-destructive">{photoError}</p>}
  </div>
);
