import type { Request, Response } from "express";
import { validated } from "../../shared/middlewares/validate.js";
import type { CreateUserBody, UserIdParam } from "./user.schemas.js";
import { userService } from "./user.service.js";

// Controllers read already-validated input off res.locals via validated.*,
// so they never re-parse or cast raw req.body / req.params themselves.
export const userController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateUserBody>(res);
    const user = await userService.createUser(body);
    res.status(201).json(user);
  },

  async get(_req: Request, res: Response) {
    const { id } = validated.params<UserIdParam>(res);
    const user = await userService.getUser(id);
    res.json(user);
  },

  async list(_req: Request, res: Response) {
    const users = await userService.listUsers();
    res.json(users);
  },
};
