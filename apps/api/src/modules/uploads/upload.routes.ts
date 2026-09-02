import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { AppError } from "#middlewares/error-handler.js";
import { requireAuth } from "#middlewares/require-auth.js";

import { uploadController } from "./upload.controller.js";

const MAX_FILES = 6;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INVALID_FILE_STATUS = 422;

const messageForMulterError = (code: multer.MulterError["code"]): string => {
  switch (code) {
    case "LIMIT_FILE_SIZE":
      return `Each image must be ${MAX_FILE_SIZE_MB} MB or smaller.`;
    case "LIMIT_FILE_COUNT":
    case "LIMIT_UNEXPECTED_FILE":
      return `You can upload at most ${MAX_FILES} images at once.`;
    default:
      return "That file could not be uploaded. Use a JPEG, PNG or WebP image.";
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: MAX_FILES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(
        new AppError(
          "INVALID_FILE",
          "Only JPEG, PNG or WebP images are allowed.",
          INVALID_FILE_STATUS,
        ),
      );
      return;
    }
    cb(null, true);
  },
});

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.array("files", MAX_FILES)(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }
    if (err instanceof AppError) {
      next(err);
      return;
    }
    if (err instanceof multer.MulterError) {
      next(new AppError("INVALID_FILE", messageForMulterError(err.code), INVALID_FILE_STATUS));
      return;
    }
    next(err);
  });
};

export const uploadRoutes = Router();

uploadRoutes.post("/", requireAuth, handleUpload, uploadController.upload);
