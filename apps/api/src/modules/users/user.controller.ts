import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { getAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { CreateUserBody, UpdateOwnProfileBody, UserIdParam } from "./user.schemas.js";
import { userService } from "./user.service.js";

const CREATED_STATUS = 201;

const requirePrincipal = (res: Response) => {
  const principal = getAuthPrincipal(res);
  if (!principal) throw new Error("reached without an auth principal");
  return principal;
};

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

  async updateMe(_req: Request, res: Response) {
    const { userId } = requirePrincipal(res);
    const body = validated.body<UpdateOwnProfileBody>(res);

    const user = await userService.updateMe(userId, body);
    sendSuccess(res, user, "Profile updated.");
  },
};
