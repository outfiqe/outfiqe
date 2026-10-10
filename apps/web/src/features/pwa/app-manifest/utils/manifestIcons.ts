import type { MetadataRoute } from "next";

import {
  appIconPath,
  installAppIcons,
  PNG_MIME_TYPE,
  SCALABLE_ICON_PATH,
  SCALABLE_ICON_SIZES,
  SVG_MIME_TYPE,
} from "../constants/appIcons";

type ManifestIcon = NonNullable<MetadataRoute.Manifest["icons"]>[number];

export const toManifestIcons = (): ManifestIcon[] => [
  ...installAppIcons.map(({ size, purpose }) => ({
    src: appIconPath({ size, purpose }),
    sizes: `${size}x${size}`,
    type: PNG_MIME_TYPE,
    purpose,
  })),
  {
    src: SCALABLE_ICON_PATH,
    sizes: SCALABLE_ICON_SIZES,
    type: SVG_MIME_TYPE,
    purpose: "any",
  },
];
