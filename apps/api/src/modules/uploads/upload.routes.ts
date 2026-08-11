import { Router } from "express";
import multer from "multer";
import type { NextFunction, Request, Response } from "express";

import { uploadController } from "./upload.controller.js";

import { requireAuth } from "../../shared/middlewares/require-auth.js";
import { AppError } from "../../shared/middlewares/error-handler.js";

const MAX_FILES = 6;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const INVALID_FILE_STATUS = 422;

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
      next(new AppError("INVALID_FILE", err.message, INVALID_FILE_STATUS));
      return;
    }
    next(err);
  });
};

export const uploadRoutes = Router();

uploadRoutes.post("/", requireAuth, handleUpload, uploadController.upload);
