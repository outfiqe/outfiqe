export const EMAIL_LOGO_PATH = "/email/logo.png";

export const EMAIL_LOGO_RENDER_SIZE = { width: 272, height: 80 } as const;

const EMAIL_LOGO_PIXEL_DENSITY = 2;

export const EMAIL_LOGO_DISPLAY_SIZE = {
  width: EMAIL_LOGO_RENDER_SIZE.width / EMAIL_LOGO_PIXEL_DENSITY,
  height: EMAIL_LOGO_RENDER_SIZE.height / EMAIL_LOGO_PIXEL_DENSITY,
} as const;

const TRAILING_SLASHES = /\/+$/;

export const emailLogoUrl = (siteOrigin: string): string =>
  `${siteOrigin.replace(TRAILING_SLASHES, "")}${EMAIL_LOGO_PATH}`;
