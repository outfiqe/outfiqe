import { DomainEvents, eventBus } from "#events/event-bus.js";
import { hashPassword } from "#lib/password.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { userRepository } from "./user.repository.js";
import type { CreateUserInput, PublicUser, UpdateUserProfileInput } from "./user.types.js";
import { toPublicUser } from "./user.utils.js";

export const userService = {
  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError("USER_EXISTS", "A user with this email already exists", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({ ...input, passwordHash });

    await eventBus.publish(DomainEvents.USER_CREATED, { userId: user.id, email: user.email });

    return toPublicUser(user);
  },

  async getUser(id: string): Promise<PublicUser> {
    const user = await userRepository.findById(id);
    if (!user) throw new AppError("USER_NOT_FOUND", "User not found", 404);
    return toPublicUser(user);
  },

  async listUsers(): Promise<PublicUser[]> {
    const users = await userRepository.list();
    return users.map(toPublicUser);
  },

  async updateMe(id: string, input: UpdateUserProfileInput): Promise<PublicUser> {
    const updated = await userRepository.updateProfile(id, input);
    return toPublicUser(updated);
  },
};
