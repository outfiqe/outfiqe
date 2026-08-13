"use client";

import { ImagePlus, Loader2, X } from "lucide-react";

import { cn } from "./cn";
import { HiddenFileInput } from "./hidden-file-input";
import { IMAGE_CROP_SHAPE, ImageCropModal } from "./image-crop-modal";
import { useImageCropUpload } from "./use-image-crop-upload";

const BANNER_ASPECT = 3.5;

type BannerUploaderProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  onUpload: (files: File[]) => Promise<string[]>;
  className?: string;
};

export const BannerUploader = ({ value, onChange, onUpload, className }: BannerUploaderProps) => {
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
      <div
        className="group relative w-full overflow-hidden rounded-2xl bg-muted bg-cover bg-center"
        style={{
          aspectRatio: BANNER_ASPECT,
          ...(value ? { backgroundImage: `url(${value})` } : {}),
        }}
      >
        {!value && (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImagePlus className="size-5" />
            <span className="text-xs font-medium">Add a banner</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          aria-label={value ? "Change banner" : "Upload banner"}
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-sm font-medium text-transparent transition-colors group-hover:bg-black/45 group-hover:text-white disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <Loader2 className="size-5 animate-spin text-foreground group-hover:text-white" />
          ) : (
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              {value ? "Change banner" : "Upload banner"}
            </span>
          )}
        </button>

        {value && !isUploading && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove banner"
            className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>

      <HiddenFileInput inputRef={inputRef} onFilesSelected={handleFileSelect} />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {pendingCrop && (
        <ImageCropModal
          imageSrc={pendingCrop.objectUrl}
          fileName={pendingCrop.file.name}
          mimeType={pendingCrop.file.type || "image/jpeg"}
          aspect={BANNER_ASPECT}
          cropShape={IMAGE_CROP_SHAPE.RECT}
          title="Adjust banner"
          cropAreaClassName="h-56"
          onCancel={closeCropModal}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
};
