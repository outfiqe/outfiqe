"use client";

import { CropSurface, HiddenFileInput } from "@outfiqe/design-system";
import { ImagePlus, Plus, X } from "lucide-react";
import type { CSSProperties } from "react";

import type { usePendingPhotos } from "../hooks/usePendingPhotos";

type PendingPhotos = ReturnType<typeof usePendingPhotos>;

type PhotoPaneOverlayProps = {
  pending: PendingPhotos;
  activeId: string;
  maxPhotos: number;
};

const PhotoPaneOverlay = ({ pending, activeId, maxPhotos }: PhotoPaneOverlayProps) => (
  <>
    <button
      type="button"
      onClick={() => pending.removePhoto(activeId)}
      aria-label="Remove photo"
      className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/70"
    >
      <X className="size-3.5" />
    </button>
    <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
      {pending.photos.length}/{maxPhotos} photos
    </span>
    {pending.photos.length < maxPhotos && (
      <button
        type="button"
        onClick={() => pending.inputRef.current?.click()}
        aria-label="Add another photo"
        className="absolute bottom-2.5 right-2.5 flex size-9 items-center justify-center rounded-full bg-foreground text-background shadow-md transition-transform hover:scale-105"
      >
        <Plus className="size-4.5" />
      </button>
    )}
  </>
);

type PhotoCropPaneProps = {
  pending: PendingPhotos;
  maxPhotos: number;
  aspect: number;
  cropAreaStyle: CSSProperties;
  error?: string | null;
  emptyLabel?: string;
};

export const PhotoCropPane = ({
  pending,
  maxPhotos,
  aspect,
  cropAreaStyle,
  error,
  emptyLabel = "Add a photo",
}: PhotoCropPaneProps) => {
  const { activePhoto } = pending;

  return (
    <>
      {activePhoto ? (
        activePhoto.file ? (
          <CropSurface
            imageSrc={activePhoto.url}
            aspect={aspect}
            crop={activePhoto.crop}
            onCropChange={(crop) => pending.updateActivePhoto({ crop })}
            zoom={activePhoto.zoom}
            onZoomChange={(zoom) => pending.updateActivePhoto({ zoom })}
            onCropComplete={(croppedAreaPixels) => pending.updateActivePhoto({ croppedAreaPixels })}
            className="min-h-0 flex-1"
            cropAreaStyle={cropAreaStyle}
            showGrid
            showZoomSlider={false}
            overlay={
              <PhotoPaneOverlay pending={pending} activeId={activePhoto.id} maxPhotos={maxPhotos} />
            }
          />
        ) : (
          <div className="min-h-0 flex-1">
            <div
              className="relative w-full overflow-hidden bg-muted bg-cover bg-center"
              style={{ ...cropAreaStyle, backgroundImage: `url(${activePhoto.url})` }}
            >
              <PhotoPaneOverlay pending={pending} activeId={activePhoto.id} maxPhotos={maxPhotos} />
            </div>
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => pending.inputRef.current?.click()}
          style={{ aspectRatio: cropAreaStyle.aspectRatio }}
          className="relative flex min-h-0 w-full flex-1 flex-col items-center justify-center gap-2 bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <ImagePlus className="size-7" />
          <span className="text-sm font-medium">{emptyLabel}</span>
          <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
            {pending.photos.length}/{maxPhotos} photos
          </span>
        </button>
      )}

      <HiddenFileInput inputRef={pending.inputRef} onFilesSelected={pending.handleFileSelect} />

      {error && <p className="px-3 py-2 text-center text-xs text-destructive">{error}</p>}
    </>
  );
};
