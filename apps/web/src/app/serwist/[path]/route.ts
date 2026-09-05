import { createSerwistRoute } from "@serwist/turbopack";

import { APPLE_SPLASH_DIRECTORY } from "@/features/pwa/constants/appleSplashScreens";
import { SCREENSHOT_DIRECTORY } from "@/features/pwa/constants/appScreenshots";
import { IMAGE_HOSTS_GLOBAL_NAME } from "@/features/pwa/constants/runtimeCaching";
import { OFFLINE_PATH } from "@/features/pwa/constants/serviceWorker";
import { toImageHosts } from "@/features/pwa/utils/imageHosts";

const SERVICE_WORKER_SOURCE = "src/app/sw.ts";

const UNVERSIONED_BUILD_REVISION = "development";

const NODE_MODULES_GLOB = "**/node_modules/**/*";

const appleSplashGlob = `public${APPLE_SPLASH_DIRECTORY}/**/*`;

const installScreenshotGlob = `public${SCREENSHOT_DIRECTORY}/**/*`;

const offlinePageRevision =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? UNVERSIONED_BUILD_REVISION;

const imageHosts = toImageHosts(
  process.env.NEXT_PUBLIC_IMAGE_HOSTS,
  process.env.NEXT_PUBLIC_SOCKET_URL,
);

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: SERVICE_WORKER_SOURCE,
    useNativeEsbuild: true,
    esbuildOptions: {
      format: "iife",
      define: { [IMAGE_HOSTS_GLOBAL_NAME]: JSON.stringify(imageHosts) },
    },
    globIgnores: [NODE_MODULES_GLOB, appleSplashGlob, installScreenshotGlob],
    additionalPrecacheEntries: [{ url: OFFLINE_PATH, revision: offlinePageRevision }],
  },
);
