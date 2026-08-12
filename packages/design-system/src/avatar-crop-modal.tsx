"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "./button";
import { getCroppedImageFile } from "./crop-image";
import { Modal } from "./modal";

type AvatarCropModalProps = {
  imageSrc: string;
  fileName: string;
  mimeType: string;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

export const AvatarCropModal = ({
  imageSrc,
  fileName,
  mimeType,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, fileName, mimeType);
      onConfirm(file);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onCancel}
      title="Adjust photo"
      description="Drag to reposition, use the slider to zoom."
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
      <div className="relative h-72 w-full overflow-hidden rounded-xl bg-muted">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
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
    </Modal>
  );
};
