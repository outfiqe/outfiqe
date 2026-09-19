import { POST_LAYOUT_ASPECT } from "@outfiqe/utils";
import type { CSSProperties } from "react";

export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_TAGGED_PRODUCTS = 6;
export const MAX_PHOTOS = 6;
export const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";

export const DEFAULT_POST_LAYOUT = "PORTRAIT";
export const PHOTO_ASPECT = POST_LAYOUT_ASPECT[DEFAULT_POST_LAYOUT];

export const cropBoxStyleForAspect = (aspect: number): CSSProperties => ({
  width: "100%",
  height: "100%",
  aspectRatio: String(aspect),
});

export const CROP_BOX_STYLE: CSSProperties = cropBoxStyleForAspect(PHOTO_ASPECT);
