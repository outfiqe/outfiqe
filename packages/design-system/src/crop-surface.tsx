"use client";

import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";

import { cn } from "./cn";
import type { PixelCrop } from "./crop-image";

export const IMAGE_CROP_SHAPE = {
  ROUND: "round",
  RECT: "rect",
} as const;

export type ImageCropShape = (typeof IMAGE_CROP_SHAPE)[keyof typeof IMAGE_CROP_SHAPE];

const MAX_ZOOM = 3;

export type CropSurfaceProps = {
  imageSrc: string;
  aspect: number;
  cropShape?: ImageCropShape;
  crop: { x: number; y: number };
  onCropChange: (crop: { x: number; y: number }) => void;
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedAreaPixels: PixelCrop) => void;
  cropAreaClassName?: string;
  cropAreaStyle?: CSSProperties;
  showGrid?: boolean;
  showZoomSlider?: boolean;
  overlay?: ReactNode;
  className?: string;
};

export const CropSurface = ({
  imageSrc,
  aspect,
  cropShape = IMAGE_CROP_SHAPE.RECT,
  crop,
  onCropChange,
  zoom,
  onZoomChange,
  onCropComplete,
  cropAreaClassName = "h-72",
  cropAreaStyle,
  showGrid = false,
  showZoomSlider = true,
  overlay,
  className,
}: CropSurfaceProps) => {
  const [isInteracting, setIsInteracting] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoFittedSrcRef = useRef<Set<string>>(new Set());

  const handleCropComplete = useCallback(
    (_area: Area, areaPixels: Area) => onCropComplete(areaPixels),
    [onCropComplete],
  );

  const handleMediaLoaded = useCallback(
    ({ width: mediaWidth, height: mediaHeight }: MediaSize) => {
      if (autoFittedSrcRef.current.has(imageSrc)) return;
      autoFittedSrcRef.current.add(imageSrc);

      const box = containerRef.current?.getBoundingClientRect();
      if (!box || mediaWidth === 0 || mediaHeight === 0) return;
      const coverZoom = Math.min(
        Math.max(box.width / mediaWidth, box.height / mediaHeight),
        MAX_ZOOM,
      );
      if (coverZoom > 1) onZoomChange(coverZoom);
    },
    [imageSrc, onZoomChange],
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div
        ref={containerRef}
        className={cn("relative w-full overflow-hidden bg-muted", cropAreaClassName)}
        style={cropAreaStyle}
        onPointerDown={() => setIsInteracting(true)}
        onPointerUp={() => setIsInteracting(false)}
        onPointerLeave={() => setIsInteracting(false)}
      >
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          cropShape={cropShape}
          showGrid={showGrid && isInteracting}
          onCropChange={onCropChange}
          onZoomChange={onZoomChange}
          onCropComplete={handleCropComplete}
          onMediaLoaded={handleMediaLoaded}
          style={{ cropAreaStyle: { border: "none", boxShadow: "none" } }}
        />
        {overlay}
      </div>

      {showZoomSlider && (
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Zoom</span>
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => onZoomChange(Number(event.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            aria-label="Zoom"
          />
        </div>
      )}
    </div>
  );
};
