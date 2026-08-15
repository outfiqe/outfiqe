import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "#config/env.config.js";
import { sendSuccess } from "#lib/api-response.utils.js";

import { adminInviteRoutes } from "./modules/admin-invites/adminInvite.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { brandApplicationRoutes } from "./modules/brand-applications/brandApplication.routes.js";
import { brandRoutes } from "./modules/brands/brand.routes.js";
import { cartRoutes } from "./modules/cart/cart.routes.js";
import { categoryRoutes } from "./modules/categories/category.routes.js";
import { collectionRoutes } from "./modules/collections/collection.routes.js";
import { creatorLookRoutes } from "./modules/creator-looks/creatorLook.routes.js";
import { creatorRoutes } from "./modules/creators/creator.routes.js";
import { followRoutes } from "./modules/follows/follow.routes.js";
import { heroSlideRoutes } from "./modules/hero-slides/heroSlide.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { uploadRoutes } from "./modules/uploads/upload.routes.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { wishlistRoutes } from "./modules/wishlist/wishlist.routes.js";
import { errorHandler } from "./shared/middlewares/error-handler.js";
import { httpLogger } from "./shared/middlewares/http-logger.js";
import { resolvedUploadsDir } from "./shared/storage/storage.factory.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.ALLOWED_ORIGINS, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use(httpLogger);

  if (env.STORAGE_DRIVER === "local") {
    app.use(
      "/uploads",
      express.static(resolvedUploadsDir, {
        setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
      }),
    );
  }

  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok" }, "Service is healthy");
  });

  app.use("/api/users", userRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/brand-applications", brandApplicationRoutes);
  app.use("/api/brands", brandRoutes);
  app.use("/api/creators", creatorRoutes);
  app.use("/api/admin/invites", adminInviteRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/collections", collectionRoutes);
  app.use("/api/creator-looks", creatorLookRoutes);
  app.use("/api/follows", followRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/hero-slides", heroSlideRoutes);

  app.use(errorHandler);

  return app;
};
