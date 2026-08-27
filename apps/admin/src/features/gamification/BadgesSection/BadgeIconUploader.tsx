import {
  Button,
  cn,
  HiddenFileInput,
  IMAGE_CROP_SHAPE,
  ImageCropModal,
  useImageCropUpload,
} from "@outfiqe/design-system";
import { ImagePlus, Loader2, X } from "lucide-react";

import { gamificationApi } from "../api";
import { BADGE_ICON_IMAGE_ACCEPT } from "../badgeOptions.constants";

const SQUARE_ASPECT = 1;
const RASTERIZED_MIME_TYPE = "image/png";
const RASTERIZED_FILE_NAME = "badge-icon.png";

const uploadBadgeIconImage = async (files: File[]): Promise<string[]> => {
  const [file] = files;
  if (!file) return [];
  return [await gamificationApi.uploadBadgeIconImage(file)];
};

const PREVIEW_SIZE_CLASS = "size-14 shrink-0";

export const BadgeIconUploader = ({
  value,
  onChange,
  onClear,
  shapeClassName = "rounded-lg",
}: {
  value: string;
  onChange: (url: string) => void;
  onClear: () => void;
  shapeClassName?: string;
}) => {
  const {
    inputRef,
    isUploading,
    error,
    pendingCrop,
    handleFileSelect,
    closeCropModal,
    handleCropConfirm,
  } = useImageCropUpload<string>({
    value,
    onChange,
    onUpload: uploadBadgeIconImage,
    applyUrl: (url) => url,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {value ? (
          <div
            className={cn(
              PREVIEW_SIZE_CLASS,
              "border border-border bg-cover bg-center bg-no-repeat",
              shapeClassName,
            )}
            style={{ backgroundImage: `url(${value})` }}
          />
        ) : (
          <div
            className={cn(
              PREVIEW_SIZE_CLASS,
              "flex items-center justify-center border border-dashed border-border text-muted-foreground",
              shapeClassName,
            )}
          >
            <ImagePlus className="size-5" />
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Uploading…
              </>
            ) : value ? (
              "Change image"
            ) : (
              "Upload image"
            )}
          </Button>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
            >
              <X className="size-3" />
              Remove
            </button>
          )}
        </div>
      </div>

      <HiddenFileInput
        inputRef={inputRef}
        accept={BADGE_ICON_IMAGE_ACCEPT}
        onFilesSelected={handleFileSelect}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      {pendingCrop && (
        <ImageCropModal
          imageSrc={pendingCrop.objectUrl}
          fileName={RASTERIZED_FILE_NAME}
          mimeType={RASTERIZED_MIME_TYPE}
          aspect={SQUARE_ASPECT}
          cropShape={IMAGE_CROP_SHAPE.RECT}
          title="Position badge icon"
          description="Drag to reposition, use the slider to zoom. The image is saved as a PNG."
          onCancel={closeCropModal}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
};
