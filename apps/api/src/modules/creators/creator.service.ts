import { creatorApprovedTemplate, creatorRejectedTemplate } from "#email-templates/templates.js";
import { CreatorStatus, FollowTargetType } from "#generated/prisma/enums.js";
import { sendEmail } from "#lib/email.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { creatorLookRepository } from "#modules/creator-looks/creatorLook.repository.js";
import { followRepository } from "#modules/follows/follow.repository.js";
import { productRepository } from "#modules/products/product.repository.js";
import { productService } from "#modules/products/product.service.js";
import { userRepository } from "#modules/users/user.repository.js";
import type { UserRecord } from "#modules/users/user.types.js";

import type { ListCreatorsQuery, UpdateCreatorProfileBody } from "./creator.schemas.js";
import type { CreatorProfile, CreatorProfilePage, PublicCreatorProfile } from "./creator.types.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const toProfile = (user: UserRecord): CreatorProfile => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  avatarUrl: user.avatarUrl,
  isCreator: user.isCreator,
  creatorStatus: user.creatorStatus,
});

const requireUser = async (userId: string): Promise<UserRecord> => {
  const user = await userRepository.findById(userId);
  if (!user) throw new AppError("USER_NOT_FOUND", "User not found.", NOT_FOUND_STATUS);
  return user;
};

const requirePendingCreator = async (userId: string): Promise<UserRecord> => {
  const user = await requireUser(userId);
  if (user.creatorStatus !== CreatorStatus.PENDING) {
    throw new AppError(
      "NOT_PENDING",
      "This creator application is not pending review.",
      CONFLICT_STATUS,
    );
  }
  return user;
};

export const creatorService = {
  async apply(userId: string): Promise<CreatorProfile> {
    const user = await requireUser(userId);

    if (
      user.creatorStatus === CreatorStatus.PENDING ||
      user.creatorStatus === CreatorStatus.APPROVED
    ) {
      throw new AppError(
        "ALREADY_APPLIED",
        "You've already applied to become a creator.",
        CONFLICT_STATUS,
      );
    }

    const updated = await userRepository.updateCreatorStatus(userId, {
      creatorStatus: CreatorStatus.PENDING,
    });

    logger.info(`Creator application submitted: ${userId}`);
    return toProfile(updated);
  },

  async getMine(userId: string): Promise<CreatorProfile> {
    return toProfile(await requireUser(userId));
  },

  async updateMe(userId: string, input: UpdateCreatorProfileBody): Promise<CreatorProfile> {
    await requireUser(userId);
    const updated = await userRepository.updateProfile(userId, input);
    return toProfile(updated);
  },

  async getPublicProfile(handle: string, viewerId?: string): Promise<PublicCreatorProfile> {
    const user = await userRepository.findByHandle(handle);
    if (!user || !user.isCreator) {
      throw new AppError("NOT_FOUND", "Creator not found.", NOT_FOUND_STATUS);
    }

    const [postsCount, taggedProductIds, isFollowing] = await Promise.all([
      creatorLookRepository.countByCreatorId(user.id),
      productRepository.listProductIdsTaggedByCreator(user.id),
      viewerId ? followRepository.isFollowing(viewerId, FollowTargetType.USER, user.id) : false,
    ]);

    return {
      userId: user.id,
      name: user.name,
      handle: user.handle,
      heightCm: user.heightCm,
      creatorStatus: user.creatorStatus,
      postsCount,
      followerCount: user.followerCount,
      taggedPiecesCount: taggedProductIds.length,
      isFollowing,
    };
  },

  async list(query: ListCreatorsQuery): Promise<CreatorProfilePage> {
    const rows = await userRepository.listByCreatorStatus(query.status, {
      cursor: query.cursor,
      limit: query.limit,
    });

    const { items, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);
    return { creators: items.map(toProfile), nextCursor };
  },

  async approve(userId: string, adminUserId: string): Promise<void> {
    const user = await requirePendingCreator(userId);

    await userRepository.updateCreatorStatus(userId, {
      creatorStatus: CreatorStatus.APPROVED,
      isCreator: true,
    });
    await productService.recountWornByForCreator(userId);

    const { subject, html } = creatorApprovedTemplate();
    await sendEmail({
      to: user.email,
      subject,
      body: "Your Outfiqe creator account is approved.",
      html,
    });

    logger.info(`Creator approved: ${userId} by admin ${adminUserId}`);
  },

  async reject(userId: string, adminUserId: string): Promise<void> {
    const user = await requirePendingCreator(userId);

    await userRepository.updateCreatorStatus(userId, {
      creatorStatus: CreatorStatus.REJECTED,
      isCreator: false,
    });

    const { subject, html } = creatorRejectedTemplate();
    await sendEmail({
      to: user.email,
      subject,
      body: "An update on your Outfiqe creator application.",
      html,
    });

    logger.info(`Creator rejected: ${userId} by admin ${adminUserId}`);
  },
};
