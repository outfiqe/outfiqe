import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.js";
import { createUserSchema, userIdParamSchema } from "./user.schemas.js";
import { userController } from "./user.controller.js";

export const userRoutes = Router();

userRoutes.post("/", validate({ body: createUserSchema }), userController.create);
userRoutes.get("/", userController.list);
userRoutes.get("/:id", validate({ params: userIdParamSchema }), userController.get);
