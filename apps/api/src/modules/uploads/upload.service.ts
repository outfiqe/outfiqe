import { storage } from "#storage/storage.js";
import type { UploadedFile } from "#storage/storage.types.js";

export const uploadService = {
  async uploadFiles(files: Express.Multer.File[]): Promise<UploadedFile[]> {
    return Promise.all(
      files.map((file) =>
        storage.upload({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
        }),
      ),
    );
  },
};
