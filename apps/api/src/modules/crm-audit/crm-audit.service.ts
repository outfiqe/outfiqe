import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import { crmAuditRepository } from "./crm-audit.repository.js";
import type { CrmAuditLogPage, RecordAuditInput } from "./crm-audit.types.js";

export const crmAudit = {
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await crmAuditRepository.insert(input);
    } catch (error) {
      logger.error(
        `CRM audit write failed for ${input.action} on org ${input.organizationId}: ${describeError(error)}`,
      );
    }
  },

  async list(
    organizationId: string,
    params: { cursor?: string; limit: number },
  ): Promise<CrmAuditLogPage> {
    const rows = await crmAuditRepository.list(organizationId, params);

    const hasMore = rows.length > params.limit;
    const entries = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? (entries.at(-1)?.id ?? null) : null;

    return { entries, nextCursor };
  },
};
