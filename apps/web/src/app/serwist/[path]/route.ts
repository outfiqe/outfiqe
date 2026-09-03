import { createSerwistRoute } from "@serwist/turbopack";

import { APPLE_SPLASH_DIRECTORY } from "@/features/pwa/constants/appleSplashScreens";
import { OFFLINE_PATH } from "@/features/pwa/constants/serviceWorker";

const SERVICE_WORKER_SOURCE = "src/app/sw.ts";

const UNVERSIONED_BUILD_REVISION = "development";

const NODE_MODULES_GLOB = "**/node_modules/**/*";

const appleSplashGlob = `public${APPLE_SPLASH_DIRECTORY}/**/*`;

const offlinePageRevision =
  process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GIT_COMMIT_SHA ?? UNVERSIONED_BUILD_REVISION;

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute(
  {
    swSrc: SERVICE_WORKER_SOURCE,
    useNativeEsbuild: true,
    esbuildOptions: { format: "iife" },
    globIgnores: [NODE_MODULES_GLOB, appleSplashGlob],
    additionalPrecacheEntries: [{ url: OFFLINE_PATH, revision: offlinePageRevision }],
  },
);
