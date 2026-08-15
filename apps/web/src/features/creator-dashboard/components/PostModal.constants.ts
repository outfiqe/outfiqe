import type { CSSProperties } from "react";

export const SEARCH_DEBOUNCE_MS = 300;
export const MAX_TAGGED_PRODUCTS = 6;
export const MAX_PHOTOS = 6;
export const PHOTO_ASPECT = 4 / 5;
export const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";

const LEFT_PANE_WIDTH_PX = 380;
export const MODAL_ROW_HEIGHT_PX = LEFT_PANE_WIDTH_PX / PHOTO_ASPECT;

export const CROP_BOX_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  aspectRatio: "4 / 5",
};
