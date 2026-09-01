import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { platformAuditRepository } from "./platform-audit.repository.js";
import type {
  PlatformAuditListFilters,
  PlatformAuditLogPage,
  RecordPlatformAuditInput,
} from "./platform-audit.types.js";

export const platformAudit = {
  async record(input: RecordPlatformAuditInput): Promise<void> {
    try {
      await platformAuditRepository.insert(input);
    } catch (error) {
      logger.error(
        `Platform audit write failed for ${input.action} by ${input.actorUserId}: ${describeError(error)}`,
      );
    }
  },

  async list(filters: PlatformAuditListFilters): Promise<PlatformAuditLogPage> {
    const rows = await platformAuditRepository.list(filters);
    const hasMore = rows.length > filters.limit;
    const entries = hasMore ? rows.slice(0, filters.limit) : rows;
    const nextCursor = hasMore ? (entries.at(-1)?.id ?? null) : null;
    return { entries, nextCursor };
  },
};
