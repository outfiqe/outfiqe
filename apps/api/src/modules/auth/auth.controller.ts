import type { Request, Response } from "express";
import { validated } from "../../shared/middlewares/validate.js";
import type { LoginBody } from "./auth.schemas.js";
import { authService } from "./auth.service.js";

export const authController = {
  async login(_req: Request, res: Response) {
    const { email, password } = validated.body<LoginBody>(res);
    const tokens = await authService.login(email, password);
    res.json(tokens);
  },
};
