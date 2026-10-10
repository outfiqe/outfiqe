export const APP_ICON_DIRECTORY = "/icons";

export const SCALABLE_ICON_PATH = "/logo.svg";

export const PNG_MIME_TYPE = "image/png";

export const SVG_MIME_TYPE = "image/svg+xml";

export const SCALABLE_ICON_SIZES = "any";

export const MASKABLE_SAFE_ZONE_RATIO = 0.8;

export const APPLE_TOUCH_ICON_SIZE = 180;

export const APPLE_TOUCH_ICON_PATH = `${APP_ICON_DIRECTORY}/apple-touch-icon.png`;

export type AppIconPurpose = "any" | "maskable";

export type AppIconDescriptor = {
  size: number;
  purpose: AppIconPurpose;
};

const INSTALL_ICON_SIZES = [192, 512];

export const appIconFileName = ({ size, purpose }: AppIconDescriptor): string =>
  `icon-${size}-${purpose}.png`;

export const appIconPath = (descriptor: AppIconDescriptor): string =>
  `${APP_ICON_DIRECTORY}/${appIconFileName(descriptor)}`;

export const installAppIcons: AppIconDescriptor[] = INSTALL_ICON_SIZES.flatMap((size) => [
  { size, purpose: "any" },
  { size, purpose: "maskable" },
]);
