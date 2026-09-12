import { DomainEvents, eventBus } from "#events/event-bus.js";
import { buildCursorPage, type CursorPage } from "#lib/pagination.utils.js";
import { hashPassword } from "#lib/password.utils.js";
import { uniqueConstraintTargetIncludes } from "#lib/prisma.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { imageProcessingService } from "#modules/image-processing/image-processing.service.js";

import { userRepository } from "./user.repository.js";
import type {
  CreateUserInput,
  PublicUser,
  UpdateUserProfileInput,
  UserRecord,
  UserSearchResult,
} from "./user.types.js";
import { toPublicUser } from "./user.utils.js";

const CONFLICT_STATUS = 409;
const USER_SEARCH_LIMIT = 10;
const HANDLE_CHANGE_COOLDOWN_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const assertHandleAvailable = async (handle: string, excludingUserId: string): Promise<void> => {
  const existing = await userRepository.findByHandle(handle);
  if (existing && existing.id !== excludingUserId) {
    throw new AppError("HANDLE_TAKEN", "That username is already taken.", CONFLICT_STATUS);
  }
};

const checkHandleAvailability = async (
  handle: string,
  userId: string,
): Promise<{ available: boolean }> => {
  try {
    await assertHandleAvailable(handle, userId);
    return { available: true };
  } catch (error) {
    if (error instanceof AppError && error.code === "HANDLE_TAKEN") return { available: false };
    throw error;
  }
};

const assertHandleChangeAllowed = (handleChangedAt: Date | null): void => {
  if (!handleChangedAt) return;

  const eligibleAt = new Date(handleChangedAt.getTime() + HANDLE_CHANGE_COOLDOWN_DAYS * MS_PER_DAY);
  if (eligibleAt > new Date()) {
    throw new AppError(
      "HANDLE_CHANGE_COOLING_DOWN",
      `You can change your username again on ${eligibleAt.toISOString().slice(0, 10)}.`,
      CONFLICT_STATUS,
    );
  }
};

const prepareHandleChange = async (
  user: UserRecord,
  handle: string | undefined,
): Promise<Date | undefined> => {
  if (handle === undefined || handle === user.handle) return undefined;
  assertHandleChangeAllowed(user.handleChangedAt);
  await assertHandleAvailable(handle, user.id);
  return new Date();
};

const writeProfile = async (userId: string, input: UpdateUserProfileInput): Promise<UserRecord> => {
  try {
    return await userRepository.updateProfile(userId, input);
  } catch (error) {
    if (uniqueConstraintTargetIncludes(error, "handle")) {
      throw new AppError("HANDLE_TAKEN", "That username is already taken.", CONFLICT_STATUS);
    }
    throw error;
  }
};

export const userService = {
  assertHandleAvailable,
  checkHandleAvailability,
  prepareHandleChange,
  writeProfile,

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

  async listUsers(params: {
    q?: string;
    cursor?: string;
    limit: number;
  }): Promise<CursorPage<PublicUser>> {
    const rows = await userRepository.list(params);
    const { items, nextCursor } = buildCursorPage(rows, params.limit, (row) => row.id);
    return { items: items.map(toPublicUser), nextCursor };
  },

  async searchUsers(query: string): Promise<UserSearchResult[]> {
    return userRepository.search(query, USER_SEARCH_LIMIT);
  },

  async updateMe(id: string, input: UpdateUserProfileInput): Promise<PublicUser> {
    if (input.phone) {
      const existingByPhone = await userRepository.findByPhone(input.phone);
      if (existingByPhone && existingByPhone.id !== id) {
        throw new AppError(
          "PHONE_EXISTS",
          "An account with this phone number already exists.",
          CONFLICT_STATUS,
        );
      }
    }

    if (input.avatarImageAssetId) {
      await imageProcessingService.assertAssetsOwnedBy([input.avatarImageAssetId], id);
    }

    let handleChangedAt: Date | undefined;
    if (input.handle !== undefined) {
      const user = await userRepository.findById(id);
      if (!user) throw new AppError("USER_NOT_FOUND", "User not found", 404);
      handleChangedAt = await prepareHandleChange(user, input.handle);
    }

    const updated = await writeProfile(id, {
      ...input,
      ...(handleChangedAt ? { handleChangedAt } : {}),
    });
    return toPublicUser(updated);
  },
};
