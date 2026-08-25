import { mkdirSync } from "node:fs";
import path from "node:path";

import { LocalDiskStorageAdapter, pipelineConfig } from "@outfiqe/image-pipeline";

import { env } from "#config/env.config.js";

const { tempUploadDir, rootDir } = pipelineConfig.storage;

export const resolvedTempUploadDir = path.resolve(process.cwd(), tempUploadDir);
export const resolvedImageStorageRootDir = path.resolve(process.cwd(), rootDir);

mkdirSync(resolvedTempUploadDir, { recursive: true });
mkdirSync(resolvedImageStorageRootDir, { recursive: true });

export const imageTempStorageAdapter = new LocalDiskStorageAdapter(resolvedTempUploadDir);
export const imageOutputStorageAdapter = new LocalDiskStorageAdapter(
  resolvedImageStorageRootDir,
  `${env.API_PUBLIC_URL}/image-processing-assets`,
);
