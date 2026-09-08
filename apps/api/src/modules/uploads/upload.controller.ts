import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";

import { uploadService } from "./upload.service.js";

const NO_FILES_STATUS = 422;

export const uploadController = {
  async upload(req: Request, res: Response) {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      throw new AppError("NO_FILES", "Attach at least one image file.", NO_FILES_STATUS);
    }

    const uploaded = await uploadService.uploadFiles(files);
    sendSuccess(res, { files: uploaded }, "Files uploaded.");
  },

  async uploadThroughPipeline(req: Request, res: Response) {
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length === 0) {
      throw new AppError("NO_FILES", "Attach at least one image file.", NO_FILES_STATUS);
    }

    const { userId } = requireAuthPrincipal(res);
    const uploaded = await uploadService.uploadFilesThroughPipeline(files, userId);
    sendSuccess(res, { files: uploaded }, "Files uploaded and queued for processing.");
  },
};
