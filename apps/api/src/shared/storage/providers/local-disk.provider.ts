import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import type { StorageProvider, UploadableFile, UploadedFile } from "../storage.types.js";

const safeExtension = (originalName: string): string => {
  const ext = path.extname(originalName).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
};

export const createLocalDiskStorageProvider = (
  uploadsDir: string,
  publicUrl: string,
): StorageProvider => ({
  async upload(file: UploadableFile): Promise<UploadedFile> {
    await mkdir(uploadsDir, { recursive: true });

    const key = `${randomUUID()}${safeExtension(file.originalName)}`;
    await writeFile(path.join(uploadsDir, key), file.buffer);

    return { key, url: `${publicUrl}/uploads/${key}` };
  },

  async delete(key: string): Promise<void> {
    await unlink(path.join(uploadsDir, key)).catch(() => undefined);
  },
});
