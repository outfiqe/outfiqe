import type { Viewport } from "next";

import {
  DARK_SCHEME_MEDIA,
  DARK_THEME_COLOR,
  LIGHT_SCHEME_MEDIA,
  LIGHT_THEME_COLOR,
} from "../constants/appTheme";

export const pwaViewport: Viewport = {
  themeColor: [
    { media: LIGHT_SCHEME_MEDIA, color: LIGHT_THEME_COLOR },
    { media: DARK_SCHEME_MEDIA, color: DARK_THEME_COLOR },
  ],
  colorScheme: "light dark",
};
