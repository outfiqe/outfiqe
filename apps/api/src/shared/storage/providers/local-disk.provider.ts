import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageProvider, UploadableFile, UploadedFile } from "#storage/storage.types.js";

const SINGLE_SEGMENT_STORAGE_KEY_PATTERN = /^[a-z0-9][a-z0-9_-]*(\.[a-z0-9]{1,5})?$/i;

const safeExtension = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
};

const isSafeStorageKey = (key: string): boolean => SINGLE_SEGMENT_STORAGE_KEY_PATTERN.test(key);

export const createLocalDiskStorageProvider = (
  uploadsDir: string,
  publicUrl: string,
): StorageProvider => {
  const publicUploadsPrefix = `${publicUrl}/uploads/`;

  return {
    async upload(file: UploadableFile): Promise<UploadedFile> {
      await mkdir(uploadsDir, { recursive: true });

      const key = `${randomUUID()}${safeExtension(file.originalName)}`;
      await writeFile(path.join(uploadsDir, key), file.buffer);

      return { key, url: `${publicUploadsPrefix}${key}` };
    },

    async read(key: string): Promise<Buffer> {
      if (!isSafeStorageKey(key)) throw new Error(`Refusing to read unsafe storage key: ${key}`);
      return readFile(path.join(uploadsDir, key));
    },

    async delete(key: string): Promise<void> {
      await unlink(path.join(uploadsDir, key)).catch(() => undefined);
    },

    keyFromPublicUrl(url: string): string | null {
      if (!url.startsWith(publicUploadsPrefix)) return null;
      const key = url.slice(publicUploadsPrefix.length);
      return isSafeStorageKey(key) ? key : null;
    },
  };
};
