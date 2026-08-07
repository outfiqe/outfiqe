import type { Request, Response } from "express";
import { validated } from "../../shared/middlewares/validate.js";
import type { CreateUserBody, UserIdParam } from "./user.schemas.js";
import { userService } from "./user.service.js";

import { sendSuccess } from "#lib/api-response.utils.js";

const CREATED_STATUS = 201;

export const userController = {
  async create(_req: Request, res: Response) {
    const body = validated.body<CreateUserBody>(res);
    const user = await userService.createUser(body);
    sendSuccess(res, user, "User created successfully", CREATED_STATUS);
  },

  async get(_req: Request, res: Response) {
    const { id } = validated.params<UserIdParam>(res);
    const user = await userService.getUser(id);
    sendSuccess(res, user, "User fetched successfully");
  },

  async list(_req: Request, res: Response) {
    const users = await userService.listUsers();
    sendSuccess(res, users, "Users fetched successfully");
  },
};
