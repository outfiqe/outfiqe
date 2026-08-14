"use client";

import { Camera, Loader2, X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "./cn";
import { HiddenFileInput } from "./hidden-file-input";
import { IMAGE_CROP_SHAPE, ImageCropModal } from "./image-crop-modal";
import { useImageCropUpload } from "./use-image-crop-upload";

type AvatarUploaderProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  fallback: ReactNode;
  className?: string;
};

export const AvatarUploader = ({
  value,
  onChange,
  onUpload,
  fallback,
  className,
}: AvatarUploaderProps) => {
  const {
    inputRef,
    isUploading,
    error,
    pendingCrop,
    handleFileSelect,
    closeCropModal,
    handleCropConfirm,
  } = useImageCropUpload({ onChange, onUpload });

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-4">
        <div className="group relative size-18 shrink-0 overflow-hidden rounded-full">
          <div
            className="flex size-full items-center justify-center bg-muted bg-cover bg-center"
            style={value ? { backgroundImage: `url(${value})` } : undefined}
          >
            {!value && fallback}
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            aria-label={value ? "Change photo" : "Upload photo"}
            className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition-colors group-hover:bg-black/45 group-hover:text-white disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <Camera className="size-5" />
            )}
          </button>
        </div>

        <div className="space-y-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
            className="block text-sm font-medium text-foreground underline-offset-2 hover:underline disabled:opacity-60"
          >
            {isUploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
              Remove
            </button>
          )}
        </div>
      </div>

      <HiddenFileInput inputRef={inputRef} onFilesSelected={handleFileSelect} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {pendingCrop && (
        <ImageCropModal
          imageSrc={pendingCrop.objectUrl}
          fileName={pendingCrop.file.name}
          mimeType={pendingCrop.file.type || "image/jpeg"}
          aspect={1}
          cropShape={IMAGE_CROP_SHAPE.ROUND}
          title="Adjust photo"
          onCancel={closeCropModal}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
};
