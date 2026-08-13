"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "./button";
import { getCroppedImageFile } from "./crop-image";
import { Modal } from "./modal";

type ImageCropShape = "round" | "rect";

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
  cropShape = "rect",
  title = "Adjust photo",
  description = "Drag to reposition, use the slider to zoom.",
  cropAreaClassName = "h-72",
  onCancel,
  onConfirm,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    setError(null);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName, mimeType);
      onConfirm(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image. Try again.");
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
      <div className={`relative w-full overflow-hidden rounded-xl bg-muted ${cropAreaClassName}`}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={handleCropComplete}
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs font-medium text-muted-foreground">Zoom</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          aria-label="Zoom"
        />
      </div>

      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
    </Modal>
  );
};
