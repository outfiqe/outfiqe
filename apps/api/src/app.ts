import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./shared/middlewares/error-handler.js";
import { httpLogger } from "./shared/middlewares/http-logger.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { brandApplicationRoutes } from "./modules/brand-applications/brandApplication.routes.js";

import { sendSuccess } from "#lib/api-response.utils.js";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());
  app.use(httpLogger);

  app.get("/health", (_req, res) => {
    sendSuccess(res, { status: "ok" }, "Service is healthy");
  });

  app.use("/api/users", userRoutes);
  app.use("/api/auth", authRoutes);
  app.use("/api/brand-applications", brandApplicationRoutes);

  app.use(errorHandler);

  return app;
};
