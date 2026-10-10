import type { PixelCrop } from "@outfiqe/design-system";

export type NewLookPhoto = {
  id: string;
  file: File;
  objectUrl: string;
  crop: { x: number; y: number };
  zoom: number;
  croppedAreaPixels: PixelCrop | null;
};
