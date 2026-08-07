import { AppError } from "../../shared/middlewares/errorHandler.js";
import { DomainEvents, eventBus } from "../../shared/events/eventBus.js";
import { hashPassword } from "../../shared/utils/password.js";
import { userRepository } from "./user.repository.js";
import type { CreateUserInput, PublicUser, UserRecord } from "./user.types.js";

// Business logic lives here - controllers stay thin, repositories stay dumb.
export const userService = {
  async createUser(input: CreateUserInput): Promise<PublicUser> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new AppError("USER_EXISTS", "A user with this email already exists", 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({ ...input, passwordHash });

    eventBus.emit(DomainEvents.USER_CREATED, { userId: user.id, email: user.email });

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
};

// Strips passwordHash before anything leaves the service layer.
function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
  };
}
