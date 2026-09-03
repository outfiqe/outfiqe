export { AppleSplashLinks } from "./components/AppleSplashLinks";
export type { AppIconDescriptor, AppIconPurpose } from "./constants/appIcons";
export {
  appIconFileName,
  appIconPath,
  APPLE_TOUCH_ICON_PATH,
  APPLE_TOUCH_ICON_SIZE,
  installAppIcons,
  MASKABLE_SAFE_ZONE_RATIO,
  SCALABLE_ICON_PATH,
} from "./constants/appIcons";
export type { AppleSplashScreen } from "./constants/appleSplashScreens";
export {
  appleSplashFileName,
  appleSplashPath,
  appleSplashScreens,
} from "./constants/appleSplashScreens";
export { appleWebAppMetadata, pwaIcons, WEB_MANIFEST_PATH } from "./constants/appMetadata";
export { appShortcuts } from "./constants/appShortcuts";
export { DARK_THEME_COLOR, LIGHT_THEME_COLOR } from "./constants/appTheme";
export { toAppleSplashMediaQuery } from "./utils/appleSplashMedia";
export { pwaViewport } from "./utils/appViewport";
export { toManifestIcons } from "./utils/manifestIcons";
