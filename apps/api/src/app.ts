import * as Sentry from "@sentry/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";

import { env } from "#config/env.config.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { isAllowedOrigin } from "#lib/cors.utils.js";

import { achievementRoutes } from "./modules/achievements/achievement.routes.js";
import { adminInviteRoutes } from "./modules/admin-invites/adminInvite.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { facebookWebhookRoutes } from "./modules/auth/oauth/facebook.webhooks.routes.js";
import { oauthRoutes } from "./modules/auth/oauth/oauth.routes.js";
import { badgeRoutes } from "./modules/badges/badge.routes.js";
import { bankAccountRoutes } from "./modules/bank-accounts/bankAccount.routes.js";
import { brandApplicationRoutes } from "./modules/brand-applications/brandApplication.routes.js";
import { brandBankAccountRoutes } from "./modules/brand-bank-accounts/brandBankAccount.routes.js";
import { brandPayoutRoutes } from "./modules/brand-payouts/brandPayout.routes.js";
import { brandRoutes } from "./modules/brands/brand.routes.js";
import { cartRoutes } from "./modules/cart/cart.routes.js";
import { categoryRoutes } from "./modules/categories/category.routes.js";
import { challengeRoutes } from "./modules/challenges/challenge.routes.js";
import { chatRoutes } from "./modules/chat/chat.routes.js";
import { conversationRoutes } from "./modules/chat/conversation.routes.js";
import { collectionRoutes } from "./modules/collections/collection.routes.js";
import { commissionRoutes } from "./modules/commissions/commission.routes.js";
import { creatorCompetitionRoutes } from "./modules/creator-competitions/creatorCompetition.routes.js";
import { creatorLeaderboardRoutes } from "./modules/creator-leaderboard/creatorLeaderboard.routes.js";
import { creatorLinkRoutes } from "./modules/creator-links/creatorLink.routes.js";
import { creatorLookRoutes } from "./modules/creator-looks/creatorLook.routes.js";
import { creatorRoutes } from "./modules/creators/creator.routes.js";
import { crmAccessRoutes } from "./modules/crm-access/crm-access.routes.js";
import { deliveryZoneRoutes } from "./modules/delivery-zones/deliveryZone.routes.js";
import { financialRollupRoutes } from "./modules/financial-rollup/financialRollup.routes.js";
import { followRoutes } from "./modules/follows/follow.routes.js";
import { heroSlideRoutes } from "./modules/hero-slides/heroSlide.routes.js";
import { createImageProcessingBullBoardRouter } from "./modules/image-processing/image-processing.bull-board.js";
import { imageProcessingRoutes } from "./modules/image-processing/image-processing.routes.js";
import { resolvedImageStorageRootDir } from "./modules/image-processing/image-processing.storage.js";
import { leaderboardRoutes } from "./modules/leaderboard/leaderboard.routes.js";
import { nepalBankRoutes } from "./modules/nepal-banks/nepalBank.routes.js";
import { notificationRoutes } from "./modules/notifications/notification.routes.js";
import { orderRoutes } from "./modules/orders/order.routes.js";
import { paymentRoutes } from "./modules/payments/payment.routes.js";
import { productReviewRoutes } from "./modules/product-reviews/product-review.routes.js";
import { productRoutes } from "./modules/products/product.routes.js";
import { sizeOptionRoutes } from "./modules/size-options/size-option.routes.js";
import { trendingRoutes } from "./modules/trending/trending.routes.js";
import { uploadRoutes } from "./modules/uploads/upload.routes.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { wishlistRoutes } from "./modules/wishlist/wishlist.routes.js";
import { withdrawRoutes } from "./modules/withdraw/withdraw.routes.js";
import { xpRoutes } from "./modules/xp/xp.routes.js";
import { errorHandler } from "./shared/middlewares/error-handler.js";
import { httpLogger } from "./shared/middlewares/http-logger.js";
import { requireAuth } from "./shared/middlewares/require-auth.js";
import { requireRole } from "./shared/middlewares/require-role.js";
import { resolvedUploadsDir } from "./shared/storage/storage.factory.js";

const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: ONE_YEAR_IN_SECONDS,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: "deny" },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        const isAllowed = isAllowedOrigin(origin, env.ALLOWED_ORIGINS, env.TENANT_BASE_DOMAIN);
        callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
      },
      credentials: true,
    }),
  );
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
  app.use(
    "/image-processing-assets",
    express.static(resolvedImageStorageRootDir, {
      setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
    }),
  );
  app.use(
    "/internal/queues",
    requireAuth,
    requireRole("ADMIN"),
    createImageProcessingBullBoardRouter(),
  );

  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok" }, "Service is healthy");
  });

  app.use("/api/users", userRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/auth/oauth", oauthRoutes);
  app.use("/api/webhooks/facebook", facebookWebhookRoutes);
  app.use("/api/brand-applications", brandApplicationRoutes);
  app.use("/api/brands", brandRoutes);
  app.use("/api/creators", creatorRoutes);
  app.use("/api/admin/invites", adminInviteRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/products/:productId/reviews", productReviewRoutes);
  app.use("/api/size-options", sizeOptionRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/delivery-zones", deliveryZoneRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/commissions", commissionRoutes);
  app.use("/api/collections", collectionRoutes);
  app.use("/api/crm", crmAccessRoutes);
  app.use("/api/creator-links", creatorLinkRoutes);
  app.use("/api/creator-looks", creatorLookRoutes);
  app.use("/api/follows", followRoutes);
  app.use("/api/wishlist", wishlistRoutes);
  app.use("/api/uploads", uploadRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/hero-slides", heroSlideRoutes);
  app.use("/api/image-processing", imageProcessingRoutes);
  app.use("/api/admin/trending", trendingRoutes);
  app.use("/api/leaderboard", leaderboardRoutes);
  app.use("/api/creator-leaderboard", creatorLeaderboardRoutes);
  app.use("/api/xp", xpRoutes);
  app.use("/api/achievements", achievementRoutes);
  app.use("/api/badges", badgeRoutes);
  app.use("/api/challenges", challengeRoutes);
  app.use("/api/creator-competitions", creatorCompetitionRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/banks", nepalBankRoutes);
  app.use("/api/bank-accounts", bankAccountRoutes);
  app.use("/api/brand-bank-accounts", brandBankAccountRoutes);
  app.use("/api/brand-payouts", brandPayoutRoutes);
  app.use("/api/withdraw", withdrawRoutes);
  app.use("/api/admin/financial-rollup", financialRollupRoutes);
  app.use("/api/chat", chatRoutes);
  app.use("/api/conversations", conversationRoutes);

  Sentry.setupExpressErrorHandler(app);
  app.use(errorHandler);

  return app;
};
