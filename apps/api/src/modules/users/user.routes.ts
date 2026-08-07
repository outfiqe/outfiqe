import { Router } from "express";
import { validate } from "../../shared/middlewares/validate.js";
import { createUserSchema, userIdParamSchema } from "./user.schemas.js";
import { userController } from "./user.controller.js";

// Every module owns and mounts its own router. app.ts just wires modules
// together - it never contains business logic itself.
//
// Validation happens here at the edge, so the service layer can trust
// its input. No asyncHandler wrapper: Express 5 forwards rejected
// promises from async handlers to the error middleware automatically.
export const userRoutes = Router();

userRoutes.post("/", validate({ body: createUserSchema }), userController.create);
userRoutes.get("/", userController.list);
userRoutes.get("/:id", validate({ params: userIdParamSchema }), userController.get);
