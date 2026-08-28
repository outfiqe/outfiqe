import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { AppError } from "#middlewares/error-handler.js";
import { requireAuth } from "#middlewares/require-auth.js";
import { validate } from "#middlewares/validate.js";
import { requirePlatformAccess } from "#modules/crm-access/crm-access.middleware.js";

import { ICON_IMAGE_MIME_TYPES, MAX_ICON_IMAGE_BYTES } from "./badge.constants.js";
import { badgeController } from "./badge.controller.js";
import {
  awardBadgeSchema,
  badgeIdParamSchema,
  createBadgeSchema,
  removeUserBadgeSchema,
  updateBadgeDisplaySchema,
  updateBadgeSchema,
  updateFeaturedBadgesSchema,
  updateTitleBadgeSchema,
  userBadgeIdParamSchema,
} from "./badge.schemas.js";

const requireAdmin = [requireAuth, requirePlatformAccess];

const INVALID_FILE_STATUS = 422;
const allowedIconImageMimeTypes = new Set<string>(ICON_IMAGE_MIME_TYPES);

const iconImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_ICON_IMAGE_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!allowedIconImageMimeTypes.has(file.mimetype)) {
      cb(
        new AppError(
          "INVALID_FILE",
          "Only PNG, JPEG or WebP images are allowed.",
          INVALID_FILE_STATUS,
        ),
      );
      return;
    }
    cb(null, true);
  },
});

const handleIconImageUpload = (req: Request, res: Response, next: NextFunction) => {
  iconImageUpload.single("file")(req, res, (err: unknown) => {
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

export const badgeRoutes = Router();

badgeRoutes.get("/collection", requireAuth, badgeController.listMyCollection);

badgeRoutes.get("/admin", ...requireAdmin, badgeController.listAllAdmin);

badgeRoutes.post(
  "/admin/icon-image",
  ...requireAdmin,
  handleIconImageUpload,
  badgeController.uploadIconImage,
);

badgeRoutes.get(
  "/admin/:badgeId",
  ...requireAdmin,
  validate({ params: badgeIdParamSchema }),
  badgeController.getAdminById,
);

badgeRoutes.get("/stats", ...requireAdmin, badgeController.getAdminStats);

badgeRoutes.get("/user-badges/manual", ...requireAdmin, badgeController.listManualAwards);

badgeRoutes.post(
  "/",
  ...requireAdmin,
  validate({ body: createBadgeSchema }),
  badgeController.create,
);

badgeRoutes.patch(
  "/featured",
  requireAuth,
  validate({ body: updateFeaturedBadgesSchema }),
  badgeController.updateFeatured,
);

badgeRoutes.patch(
  "/title",
  requireAuth,
  validate({ body: updateTitleBadgeSchema }),
  badgeController.updateTitle,
);

badgeRoutes.post(
  "/user-badges/:userBadgeId/remove",
  ...requireAdmin,
  validate({ params: userBadgeIdParamSchema, body: removeUserBadgeSchema }),
  badgeController.removeUserBadge,
);

badgeRoutes.patch(
  "/:badgeId/display",
  requireAuth,
  validate({ params: badgeIdParamSchema, body: updateBadgeDisplaySchema }),
  badgeController.updateDisplay,
);

badgeRoutes.patch(
  "/:badgeId",
  ...requireAdmin,
  validate({ params: badgeIdParamSchema, body: updateBadgeSchema }),
  badgeController.update,
);

badgeRoutes.post(
  "/:badgeId/award",
  ...requireAdmin,
  validate({ params: badgeIdParamSchema, body: awardBadgeSchema }),
  badgeController.award,
);
