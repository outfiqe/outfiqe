import { THRIFT_CONDITION_LABEL, THRIFT_CONDITION_VALUES } from "@outfiqe/utils";
import type { CSSProperties } from "react";

export const PRODUCT_PHOTO_ASPECT = 1;
export const DEFAULT_IMAGE_MIME_TYPE = "image/jpeg";

export const PRODUCT_CROP_BOX_STYLE: CSSProperties = {
  width: "100%",
  height: "100%",
  aspectRatio: "1 / 1",
};

export const THRIFT_CONDITION_OPTIONS = THRIFT_CONDITION_VALUES.map((value) => ({
  value,
  label: THRIFT_CONDITION_LABEL[value],
}));
