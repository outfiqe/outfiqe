import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { AppError } from "#middlewares/error-handler.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import {
  IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_MAX,
  IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_WINDOW_MS,
} from "#modules/image-processing/image-processing.constants.js";
import { checkImageIngestBackPressure } from "#modules/image-processing/image-processing.queue.js";

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

const TOO_MANY_REQUESTS_STATUS = 429;

const checkImagePipelineBackPressure = async (_req: Request, res: Response, next: NextFunction) => {
  const decision = await checkImageIngestBackPressure();
  if (decision.allowed) {
    next();
    return;
  }
  res.setHeader("Retry-After", decision.retryAfterSeconds);
  next(
    new AppError(
      "IMAGE_QUEUE_SATURATED",
      "The image processing queue is at capacity. Please try again shortly.",
      TOO_MANY_REQUESTS_STATUS,
    ),
  );
};

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

uploadRoutes.post(
  "/pipeline",
  requireAuth,
  rateLimit({
    namespace: "uploads-pipeline",
    windowMs: IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_WINDOW_MS,
    max: IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_MAX,
    keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  }),
  checkImagePipelineBackPressure,
  handleUpload,
  uploadController.uploadThroughPipeline,
);
