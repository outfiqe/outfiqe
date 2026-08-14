import path from "node:path";

import { env } from "#config/env.config.js";

import { createLocalDiskStorageProvider } from "./providers/local-disk.provider.js";
import type { StorageProvider } from "./storage.types.js";

export const resolvedUploadsDir = path.resolve(process.cwd(), env.UPLOADS_DIR);

export const createStorageProvider = (): StorageProvider => {
  switch (env.STORAGE_DRIVER) {
    case "local":
      return createLocalDiskStorageProvider(resolvedUploadsDir, env.API_PUBLIC_URL);
    default:
      throw new Error(`Unsupported STORAGE_DRIVER: ${env.STORAGE_DRIVER satisfies never}`);
  }
};
