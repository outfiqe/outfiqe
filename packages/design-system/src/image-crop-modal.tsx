"use client";

import { useState } from "react";

import { Button } from "./button";
import { cn } from "./cn";
import { getCroppedImageFile, type PixelCrop } from "./crop-image";
import { CropSurface, IMAGE_CROP_SHAPE, type ImageCropShape } from "./crop-surface";
import { Modal } from "./modal";

type ImageCropModalProps = {
  imageSrc: string;
  fileName: string;
  mimeType: string;
  aspect: number;
  cropShape?: ImageCropShape;
  title?: string;
  description?: string;
  cropAreaClassName?: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export const ImageCropModal = ({
  imageSrc,
  fileName,
  mimeType,
  aspect,
  cropShape = IMAGE_CROP_SHAPE.RECT,
  title = "Adjust photo",
  description = "Drag to reposition, use the slider to zoom.",
  cropAreaClassName = "h-72",
  onCancel,
  onConfirm,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    setError(null);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName, mimeType);
      onConfirm(file);
    } catch {
      setError("Couldn't process that image. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title={title}
      description={description}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={() => void handleConfirm()} disabled={isSaving || !croppedAreaPixels}>
            {isSaving ? "Saving…" : "Use photo"}
          </Button>
        </div>
      }
    >
      <CropSurface
        imageSrc={imageSrc}
        aspect={aspect}
        cropShape={cropShape}
        crop={crop}
        onCropChange={setCrop}
        zoom={zoom}
        onZoomChange={setZoom}
        onCropComplete={setCroppedAreaPixels}
        cropAreaClassName={cn(cropAreaClassName, "rounded-xl")}
      />

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </Modal>
  );
};
