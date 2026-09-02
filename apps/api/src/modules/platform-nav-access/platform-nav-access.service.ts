import { isPlatformNavKey, MAX_PLATFORM_CO_FOUNDERS, type PlatformNavKey } from "@outfiqe/utils";

import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { cacheService } from "#redis/cache.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  PLATFORM_NAV_ACCESS_CACHE_TTL_SECONDS,
  PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY,
} from "./platform-nav-access.constants.js";
import { platformNavAccessRepository } from "./platform-nav-access.repository.js";
import type {
  CoFounderContext,
  CoFounderSummary,
  NavAccessOverview,
  NavAccessResolution,
} from "./platform-nav-access.types.js";

const CONFLICT_STATUS = 409;
const NOT_FOUND_STATUS = 404;

const readHiddenNavKeysFromDb = async (): Promise<PlatformNavKey[]> => {
  const stored = await platformNavAccessRepository.findConfigHiddenNavKeys();
  return (stored ?? []).filter(isPlatformNavKey);
};

export const platformNavAccessService = {
  async getHiddenNavKeys(): Promise<PlatformNavKey[]> {
    const cached = await cacheService
      .get<PlatformNavKey[]>(PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY)
      .catch((error) => {
        logger.warn(`platform nav-access cache read failed: ${describeError(error)}`);
        return null;
      });
    if (cached) return cached.filter(isPlatformNavKey);

    const hiddenNavKeys = await readHiddenNavKeysFromDb();
    await cacheService
      .set(
        PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY,
        hiddenNavKeys,
        PLATFORM_NAV_ACCESS_CACHE_TTL_SECONDS,
      )
      .catch((error) => {
        logger.warn(`platform nav-access cache write failed: ${describeError(error)}`);
      });
    return hiddenNavKeys;
  },

  async resolveFor(userId: string): Promise<NavAccessResolution> {
    try {
      const platformOrganizationId = await platformNavAccessRepository.findPlatformOrganizationId();
      if (!platformOrganizationId) return { isCoFounder: false, hiddenNavKeys: [] };

      const [coFounderMembershipId, hiddenNavKeys] = await Promise.all([
        platformNavAccessRepository.findActiveCoFounderMembershipId(userId, platformOrganizationId),
        this.getHiddenNavKeys(),
      ]);

      return { isCoFounder: coFounderMembershipId !== null, hiddenNavKeys };
    } catch (error) {
      logger.error(`platform nav-access resolve failed for ${userId}: ${describeError(error)}`);
      return { isCoFounder: false, hiddenNavKeys: [] };
    }
  },

  async requireCoFounderContext(userId: string): Promise<CoFounderContext | null> {
    const platformOrganizationId = await platformNavAccessRepository.findPlatformOrganizationId();
    if (!platformOrganizationId) return null;

    const membershipId = await platformNavAccessRepository.findActiveCoFounderMembershipId(
      userId,
      platformOrganizationId,
    );
    if (!membershipId) return null;

    return { userId, platformOrganizationId, membershipId };
  },

  async getOverview(userId: string): Promise<NavAccessOverview> {
    const platformOrganizationId = await platformNavAccessRepository.findPlatformOrganizationId();
    const [resolution, coFounders] = await Promise.all([
      this.resolveFor(userId),
      platformOrganizationId
        ? platformNavAccessRepository.listCoFounders(platformOrganizationId)
        : Promise.resolve<CoFounderSummary[]>([]),
    ]);
    return { ...resolution, coFounders };
  },

  async listCandidates(context: CoFounderContext): Promise<CoFounderSummary[]> {
    return platformNavAccessRepository.listPromotableMemberships(context.platformOrganizationId);
  },

  async setHiddenNavKeys(
    hiddenNavKeys: PlatformNavKey[],
    context: CoFounderContext,
  ): Promise<PlatformNavKey[]> {
    const deduped = [...new Set(hiddenNavKeys)];
    const saved = await platformNavAccessRepository.replaceHiddenNavKeys(
      deduped,
      context.membershipId,
    );
    await cacheService.invalidate(PLATFORM_NAV_ACCESS_HIDDEN_KEYS_CACHE_KEY).catch(() => {});
    return saved.filter(isPlatformNavKey);
  },

  async promoteCoFounder(
    membershipId: string,
    context: CoFounderContext,
  ): Promise<CoFounderSummary> {
    const target = await platformNavAccessRepository.findPlatformMembership(
      membershipId,
      context.platformOrganizationId,
    );
    if (!target || target.status !== "ACTIVE") {
      throw new AppError(
        "MEMBERSHIP_NOT_FOUND",
        "That platform member could not be found.",
        NOT_FOUND_STATUS,
      );
    }
    if (target.isPlatformSuperAdmin) {
      throw new AppError(
        "ALREADY_CO_FOUNDER",
        "That member is already a co-founder.",
        CONFLICT_STATUS,
      );
    }

    await platformNavAccessRepository.runInTransaction(async (client) => {
      const current = await platformNavAccessRepository.countActiveCoFounders(
        context.platformOrganizationId,
        client,
      );
      if (current >= MAX_PLATFORM_CO_FOUNDERS) {
        throw new AppError(
          "CO_FOUNDER_LIMIT_REACHED",
          `The co-founder group is capped at ${MAX_PLATFORM_CO_FOUNDERS}.`,
          CONFLICT_STATUS,
        );
      }
      await platformNavAccessRepository.setCoFounderFlag(membershipId, true, client);
    });

    return {
      membershipId: target.id,
      userId: target.userId,
      name: target.user.name,
      email: target.user.email,
    };
  },

  async demoteCoFounder(membershipId: string, context: CoFounderContext): Promise<void> {
    const target = await platformNavAccessRepository.findPlatformMembership(
      membershipId,
      context.platformOrganizationId,
    );
    if (!target || !target.isPlatformSuperAdmin) {
      throw new AppError("NOT_A_CO_FOUNDER", "That member is not a co-founder.", NOT_FOUND_STATUS);
    }

    await platformNavAccessRepository.runInTransaction(async (client) => {
      const current = await platformNavAccessRepository.countActiveCoFounders(
        context.platformOrganizationId,
        client,
      );
      if (current <= 1) {
        throw new AppError(
          "LAST_CO_FOUNDER",
          "You can't remove the last co-founder — promote another member first.",
          CONFLICT_STATUS,
        );
      }
      await platformNavAccessRepository.setCoFounderFlag(membershipId, false, client);
    });
  },
};
