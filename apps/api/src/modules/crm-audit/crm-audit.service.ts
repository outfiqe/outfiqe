import { HTTP_STATUS } from "#constants/http.constants.js";
import { toCsv } from "#lib/csv-writer.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";

import { MAX_AUDIT_EXPORT_ROWS } from "./crm-audit.constants.js";
import { crmAuditRepository } from "./crm-audit.repository.js";
import type {
  AuditFilterOptions,
  AuditLogFilters,
  CrmAuditLogPage,
  RecordAuditInput,
} from "./crm-audit.types.js";

const NEXT_ROW = 1;
const AUDIT_EXPORT_HEADERS = ["When", "Who", "Action", "Result", "Details"];

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
    params: AuditLogFilters & { cursor?: string; limit: number },
  ): Promise<CrmAuditLogPage> {
    const rows = await crmAuditRepository.list(organizationId, params);

    const hasMore = rows.length > params.limit;
    const entries = hasMore ? rows.slice(0, params.limit) : rows;
    const nextCursor = hasMore ? (entries.at(-1)?.id ?? null) : null;

    return { entries, nextCursor };
  },

  listFilterOptions(organizationId: string): Promise<AuditFilterOptions> {
    return crmAuditRepository.listFilterOptions(organizationId);
  },

  async exportCsv(
    organizationId: string,
    filters: AuditLogFilters,
  ): Promise<{ csv: string; rowCount: number }> {
    const rows = await crmAuditRepository.listForExport(
      organizationId,
      filters,
      MAX_AUDIT_EXPORT_ROWS + NEXT_ROW,
    );
    if (rows.length > MAX_AUDIT_EXPORT_ROWS) {
      throw new AppError(
        "CRM_EXPORT_TOO_LARGE",
        `This log has more than ${MAX_AUDIT_EXPORT_ROWS} entries. Pick a shorter date range.`,
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    return {
      csv: toCsv(
        AUDIT_EXPORT_HEADERS,
        rows.map(({ createdAt, actorName, action, outcome, summary }) => [
          createdAt.toISOString(),
          actorName ?? "System",
          action,
          outcome,
          summary,
        ]),
      ),
      rowCount: rows.length,
    };
  },
};
