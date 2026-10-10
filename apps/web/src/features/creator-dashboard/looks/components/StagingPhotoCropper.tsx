"use client";

import { Button, CropSurface } from "@outfiqe/design-system";
import type { CSSProperties, Dispatch, SetStateAction } from "react";

import type { NewLookPhoto } from "../types/newLookPhoto";

type StagingPhotoCropperProps = {
  stagingPhoto: NewLookPhoto;
  setStagingPhoto: Dispatch<SetStateAction<NewLookPhoto | null>>;
  photoAspect: number;
  cropBoxStyle: CSSProperties;
  cancelStagingPhoto: () => void;
  confirmStagingPhoto: () => void;
};

export const StagingPhotoCropper = ({
  stagingPhoto,
  setStagingPhoto,
  photoAspect,
  cropBoxStyle,
  cancelStagingPhoto,
  confirmStagingPhoto,
}: StagingPhotoCropperProps) => (
  <div className="space-y-3 rounded-xl border border-border p-3">
    <CropSurface
      imageSrc={stagingPhoto.objectUrl}
      aspect={photoAspect}
      crop={stagingPhoto.crop}
      onCropChange={(crop) =>
        setStagingPhoto((current) => (current ? { ...current, crop } : current))
      }
      zoom={stagingPhoto.zoom}
      onZoomChange={(zoom) =>
        setStagingPhoto((current) => (current ? { ...current, zoom } : current))
      }
      onCropComplete={(croppedAreaPixels) =>
        setStagingPhoto((current) => (current ? { ...current, croppedAreaPixels } : current))
      }
      cropAreaClassName="h-56"
      cropAreaStyle={cropBoxStyle}
    />
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" onClick={cancelStagingPhoto}>
        Cancel
      </Button>
      <Button size="sm" onClick={confirmStagingPhoto} disabled={!stagingPhoto.croppedAreaPixels}>
        Use photo
      </Button>
    </div>
  </div>
);
