import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./shared/middlewares/errorHandler.js";
import { userRoutes } from "./modules/users/user.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Each module is mounted under its own namespace. If "users" later
  // becomes its own microservice, this line is roughly all that changes -
  // it becomes a proxy route or gets removed entirely from the gateway.
  app.use("/api/users", userRoutes);
  app.use("/api/auth", authRoutes);

  // Keep error handler registered last.
  app.use(errorHandler);

  return app;
}
