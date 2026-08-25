import { randomUUID } from "node:crypto";
import path from "node:path";

import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { AppError } from "#middlewares/error-handler.js";
import { rateLimit } from "#middlewares/rate-limit.js";
import { getAuthPrincipal, requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_MAX,
  IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_WINDOW_MS,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  MAX_UPLOAD_FILES,
} from "./image-processing.constants.js";
import { imageProcessingController } from "./image-processing.controller.js";
import { checkImageIngestBackPressure } from "./image-processing.queue.js";
import { getImageAssetParamsSchema } from "./image-processing.schemas.js";
import { resolvedTempUploadDir } from "./image-processing.storage.js";

const INVALID_FILE_STATUS = 422;
const TOO_MANY_REQUESTS_STATUS = 429;

const upload = multer({
  storage: multer.diskStorage({
    destination: resolvedTempUploadDir,
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}${path.extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_FILE_SIZE_BYTES, files: MAX_UPLOAD_FILES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      cb(
        new AppError(
          "INVALID_FILE",
          "Only JPEG, PNG, WebP, AVIF, or HEIC/HEIF images are allowed.",
          INVALID_FILE_STATUS,
        ),
      );
      return;
    }
    cb(null, true);
  },
});

const handleUpload = (req: Request, res: Response, next: NextFunction) => {
  upload.single("file")(req, res, (err: unknown) => {
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

const checkBackPressure = async (_req: Request, res: Response, next: NextFunction) => {
  const decision = await checkImageIngestBackPressure();
  if (!decision.allowed) {
    res.setHeader("Retry-After", decision.retryAfterSeconds);
    next(
      new AppError(
        "IMAGE_QUEUE_SATURATED",
        "The image processing queue is at capacity. Please try again shortly.",
        TOO_MANY_REQUESTS_STATUS,
      ),
    );
    return;
  }
  next();
};

export const imageProcessingRoutes = Router();

imageProcessingRoutes.post(
  "/",
  requireAuth,
  rateLimit({
    namespace: "image-processing-upload",
    windowMs: IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_WINDOW_MS,
    max: IMAGE_PROCESSING_UPLOAD_RATE_LIMIT_MAX,
    keyGenerator: (_req, res) => getAuthPrincipal(res)?.userId,
  }),
  checkBackPressure,
  handleUpload,
  imageProcessingController.upload,
);

imageProcessingRoutes.get(
  "/:assetId",
  requireAuth,
  validate({ params: getImageAssetParamsSchema }),
  imageProcessingController.getStatus,
);
