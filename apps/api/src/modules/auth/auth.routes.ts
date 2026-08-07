import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.js";
import { loginSchema } from "./auth.schemas.js";
import { authController } from "./auth.controller.js";

export const authRoutes = Router();

authRoutes.post("/login", validate({ body: loginSchema }), authController.login);
