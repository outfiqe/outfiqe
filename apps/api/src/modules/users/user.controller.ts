import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateUserBody,
  HandleAvailabilityQuery,
  ListUsersQuery,
  SearchUsersQuery,
  UpdateOwnProfileBody,
  UserIdParam,
} from "./user.schemas.js";
import { userService } from "./user.service.js";

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
    const query = validated.query<ListUsersQuery>(res);
    const page = await userService.listUsers(query);
    sendSuccess(res, page, "Users fetched successfully");
  },

  async search(_req: Request, res: Response) {
    const { q } = validated.query<SearchUsersQuery>(res);
    const users = await userService.searchUsers(q);
    sendSuccess(res, users, "Users matching the search.");
  },

  async updateMe(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const body = validated.body<UpdateOwnProfileBody>(res);

    const user = await userService.updateMe(userId, body);
    sendSuccess(res, user, "Profile updated.");
  },

  async checkHandleAvailability(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { handle } = validated.query<HandleAvailabilityQuery>(res);

    const result = await userService.checkHandleAvailability(handle, userId);
    sendSuccess(res, result, "Username availability.");
  },
};
